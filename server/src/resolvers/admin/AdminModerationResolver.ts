import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
  Field,
  ObjectType,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import { requireAdminOrModerator } from "../../lib/authGuard";
import { logger } from "../../lib/logger";
import { ModerationComment, ModerationReport } from "../../types/admin";
import { Report } from "../ReportResolver";

@ObjectType()
class ContentReportPayload {
  @Field(() => Report)
  report: Report;
  
  @Field(() => String, { nullable: true })
  contentTitle?: string;
  
  @Field(() => String)
  reporterUsername: string;
}

/**
 * Helper: Convert a DiscussionComment DB row to the ModerationComment format.
 */
function mapDiscussionComment(
  dc: any,
  reportMap: Map<string, any[]>,
): ModerationComment {
  const key = `discussionComment:${dc.id}`;
  const relatedReports = reportMap.get(key) || [];

  return {
    id: dc.id,
    type: "discussionComment",
    text: dc.text,
    authorId: dc.authorId,
    authorUsername: dc.author?.username || "Unknown",
    authorPicturePath: dc.author?.picturePath || null,
    contentId: dc.discussion?.contentId || null,
    contentTitle: null,
    discussionId: dc.discussionId,
    discussionTitle: dc.discussion?.title || null,
    parentId: dc.parentId || null,
    upvoteCount: dc.upvoteCount || 0,
    downvoteCount: dc.downvoteCount || 0,
    score: (dc.upvoteCount || 0) - (dc.downvoteCount || 0),
    isReported: relatedReports.length > 0,
    reportCount: relatedReports.length,
    reports: relatedReports.map((r: any) => ({
      id: r.id,
      reporterId: r.reporterId,
      reporterUsername: r.reporter?.username || "Unknown",
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    })),
    replies: [],
    createdAt: dc.createdAt,
    updatedAt: dc.updatedAt,
  };
}

/**
 * Helper: Build tree from flat DiscussionComment list.
 * DiscussionComments with parentId form a tree under the discussion (type="comment").
 */
function buildReplyTree(
  flatComments: ModerationComment[],
): ModerationComment[] {
  const map = new Map<number, ModerationComment>();
  const roots: ModerationComment[] = [];

  for (const c of flatComments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of flatComments) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Helper: Check if any node in the tree (or itself) is reported.
 */
function treeHasReport(node: ModerationComment): boolean {
  if (node.isReported) return true;
  return (node.replies || []).some(treeHasReport);
}

@Resolver()
export class AdminModerationResolver {
  /**
   * Lists all comments for moderation with tree structure.
   * Reported comments/trees are prioritized (appear first).
   * Discussion (type="comment") entries are top-level items.
   * DiscussionComment entries are nested as replies under their parent discussion.
   */
  @Authorized()
  @Query(() => [ModerationComment])
  async listModerationComments(
    @Arg("limit", () => Int, { nullable: true, defaultValue: 100 })
    limit: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<ModerationComment[]> {
    requireAdminOrModerator(user);

    logger.info(`[Moderation] Fetching moderation comments (limit: ${limit})`);

    // 1) Get all pending reports
    const reports = await prisma.report.findMany({
      where: {
        targetType: { in: ["comment", "discussionComment"] },
        status: "pending",
      },
      include: {
        reporter: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const reportMap = new Map<string, typeof reports>();
    for (const r of reports) {
      const key = `${r.targetType}:${r.targetId}`;
      if (!reportMap.has(key)) reportMap.set(key, []);
      reportMap.get(key)!.push(r);
    }

    // 2) Fetch Discussion entries (type="comment") - content reviews
    const discussions = await prisma.discussion.findMany({
      where: { type: "comment", isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, username: true, picturePath: true } },
        content: { select: { id: true, title: true } },
        comments: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, username: true, picturePath: true } },
          },
        },
      },
    });

    // 3) Build tree for each discussion
    const result: ModerationComment[] = [];

    for (const d of discussions) {
      const key = `comment:${d.id}`;
      const relatedReports = reportMap.get(key) || [];

      // Map child DiscussionComment entries
      const flatReplies = (d.comments || []).map((dc: any) =>
        mapDiscussionComment(
          {
            ...dc,
            discussion: { contentId: d.contentId, title: d.title || null },
          },
          reportMap,
        ),
      );

      // Build reply tree
      const replyTree = buildReplyTree(flatReplies);

      const moderationComment: ModerationComment = {
        id: d.id,
        type: "comment",
        text: d.description,
        authorId: d.authorId,
        authorUsername: d.author?.username || "Unknown",
        authorPicturePath: d.author?.picturePath || null,
        contentId: d.contentId || null,
        contentTitle: d.content?.title || null,
        discussionId: null,
        discussionTitle: null,
        parentId: null,
        upvoteCount: d.upvoteCount || 0,
        downvoteCount: d.downvoteCount || 0,
        score: (d.upvoteCount || 0) - (d.downvoteCount || 0),
        isReported: relatedReports.length > 0,
        reportCount: relatedReports.length,
        reports: relatedReports.map((r) => ({
          id: r.id,
          reporterId: r.reporterId,
          reporterUsername: r.reporter?.username || "Unknown",
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt,
        })),
        replies: replyTree,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };

      result.push(moderationComment);
    }

    // 4) Also fetch orphan DiscussionComment entries (replies to discussions of type "discussion")
    // These are comments on discussion threads, not content reviews
    const orphanDiscussionComments = await prisma.discussionComment.findMany({
      where: {
        isDeleted: false,
        discussion: { type: "discussion", isDeleted: false },
        parentId: null, // only top-level
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, username: true, picturePath: true } },
        discussion: {
          select: { id: true, title: true, contentId: true, type: true },
        },
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, username: true, picturePath: true } },
            replies: {
              where: { isDeleted: false },
              orderBy: { createdAt: "asc" },
              include: {
                author: {
                  select: { id: true, username: true, picturePath: true },
                },
              },
            },
          },
        },
      },
    });

    for (const dc of orphanDiscussionComments) {
      const mapped = mapDiscussionComment(dc, reportMap);

      // Map nested replies (2 levels)
      const nestedReplies: ModerationComment[] = (dc.replies || []).map(
        (r1: any) => {
          const r1Mapped = mapDiscussionComment(
            { ...r1, discussion: dc.discussion },
            reportMap,
          );
          r1Mapped.replies = (r1.replies || []).map((r2: any) =>
            mapDiscussionComment(
              { ...r2, discussion: dc.discussion },
              reportMap,
            ),
          );
          return r1Mapped;
        },
      );

      mapped.replies = nestedReplies;
      result.push(mapped);
    }

    // 5) Sort: Trees containing any reported item first, then by date
    result.sort((a, b) => {
      const aHasReport = treeHasReport(a);
      const bHasReport = treeHasReport(b);
      if (aHasReport && !bHasReport) return -1;
      if (!aHasReport && bHasReport) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const limited = result.slice(0, limit);

    logger.info(
      `[Moderation] Found ${limited.length} comment trees (${limited.filter((c) => treeHasReport(c)).length} with reports)`,
    );

    return limited;
  }

  /**
   * Deletes a comment by soft-deleting it.
   */
  @Authorized()
  @Mutation(() => Boolean)
  async deleteModerationComment(
    @Arg("id", () => Int) id: number,
    @Arg("type", () => String) type: string, // "comment" | "discussionComment"
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdminOrModerator(user);

    logger.info(`[Moderation] Deleting ${type} with ID: ${id}`);

    if (type === "comment") {
      await prisma.discussion.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } else if (type === "discussionComment") {
      await prisma.discussionComment.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } else {
      throw new Error("Invalid comment type");
    }

    // Also mark related reports as resolved
    await prisma.report.updateMany({
      where: {
        targetType: type,
        targetId: String(id),
        status: "pending",
      },
      data: { status: "resolved" },
    });

    logger.info(
      `[Moderation] ${type} (ID: ${id}) deleted and reports resolved`,
    );
    return true;
  }

  /**
   * Dismiss (resolve) reports for a comment without deleting it.
   */
  @Authorized()
  @Mutation(() => Boolean)
  async dismissReports(
    @Arg("targetId", () => Int) targetId: number,
    @Arg("targetType", () => String) targetType: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdminOrModerator(user);

    logger.info(
      `[Moderation] Dismissing reports for ${targetType}:${targetId}`,
    );

    await prisma.report.updateMany({
      where: {
        targetType,
        targetId: String(targetId),
        status: "pending",
      },
      data: { status: "reviewed" },
    });

    logger.info(`[Moderation] Reports dismissed for ${targetType}:${targetId}`);
    return true;
  }

  // ==========================================
  // Pending Entity Management
  // ==========================================

  @Authorized("ADMIN")
  @Query(() => [PendingEntity])
  async pendingEntities(
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<PendingEntity[]> {
    const [pendingPersons, pendingCompanies] = await Promise.all([
      prisma.person.findMany({ where: { isPending: true }, orderBy: { createdAt: 'desc' } }),
      prisma.company.findMany({ where: { isPending: true }, orderBy: { createdAt: 'desc' } }),
    ]);

    const entities: PendingEntity[] = [
      ...pendingPersons.map((p: any) => ({
        id: p.id,
        type: 'person' as const,
        name: p.name,
        createdAt: p.createdAt.toISOString(),
      })),
      ...pendingCompanies.map((c: any) => ({
        id: c.id,
        type: 'company' as const,
        name: c.name,
        createdAt: c.createdAt.toISOString(),
      })),
    ];

    logger.info(`[Moderation] Found ${entities.length} pending entities`);
    return entities;
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async approvePendingEntity(
    @Arg("entityId", () => String) entityId: string,
    @Arg("entityType", () => String) entityType: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (entityType === 'person') {
      await prisma.person.update({
        where: { id: entityId },
        data: { isPending: false },
      });
    } else if (entityType === 'company') {
      await prisma.company.update({
        where: { id: entityId },
        data: { isPending: false },
      });
    } else {
      throw new Error('Geçersiz entity türü');
    }

    logger.success(`[Moderation] Approved pending ${entityType}:${entityId}`);
    return true;
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async rejectPendingEntity(
    @Arg("entityId", () => String) entityId: string,
    @Arg("entityType", () => String) entityType: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (entityType === 'person') {
      // Delete associated content roles first
      await prisma.contentPerson.deleteMany({ where: { personId: entityId } });
      await prisma.person.delete({ where: { id: entityId } });
    } else if (entityType === 'company') {
      await prisma.contentCompany.deleteMany({ where: { companyId: entityId } });
      await prisma.company.delete({ where: { id: entityId } });
    } else {
      throw new Error('Geçersiz entity türü');
    }

    logger.info(`[Moderation] Rejected and deleted pending ${entityType}:${entityId}`);
    return true;
  }

  @Authorized("MODERATOR", "ADMIN")
  @Query(() => [ContentReportPayload])
  async getContentReports(
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentReportPayload[]> {
    const reports = await prisma.report.findMany({
      where: {
        targetType: "CONTENT",
        status: "pending",
      },
      include: {
        reporter: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const contentIds = reports.map((r) => r.targetId);
    const contents = await prisma.content.findMany({
      where: { id: { in: contentIds } },
      select: { id: true, title: true },
    });
    
    const contentMap = new Map(contents.map(c => [c.id, c.title]));

    return reports.map((r: any) => ({
      report: r,
      contentTitle: contentMap.get(r.targetId),
      reporterUsername: r.reporter.username,
    }));
  }

  @Authorized("MODERATOR", "ADMIN")
  @Mutation(() => Boolean)
  async reviewContentReports(
    @Arg("targetId", () => String) targetId: string,
    @Arg("status", () => String) status: string,
    @Arg("reason", () => String, { nullable: true }) reason: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    const { createNotification } = await import("../../lib/notifications");
    const { NOTIFICATION_TYPE_ID } = await import("../../lib/notificationTypes");

    const pendingReports = await prisma.report.findMany({
      where: {
        targetType: "CONTENT",
        targetId: targetId,
        status: "pending",
      },
    });

    await prisma.report.updateMany({
      where: {
        targetType: "CONTENT",
        targetId: targetId,
        status: "pending",
      },
      data: { status },
    });

    const typeId = status === "APPROVED" ? NOTIFICATION_TYPE_ID.REPORT_APPROVED : NOTIFICATION_TYPE_ID.REPORT_REJECTED;
    
    for (const report of pendingReports) {
      await createNotification(prisma, {
        recipientUserId: report.reporterId,
        actorUserId: user?.id,
        typeId,
        message: reason || undefined,
        contentId: targetId,
      });
    }

    return true;
  }
}

// Pending entity type for GraphQL
@ObjectType()
class PendingEntity {
  @Field(() => String)
  id: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  createdAt: string;
}
