import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
} from "type-graphql";
import { Contribution } from "../types/Contribution";
import { AppUser } from "../types/User";
import { GraphQLContext } from "../context";
import GraphQLJSON from "graphql-type-json";
import { AdminContentMutationResolver } from "./admin/AdminContentMutationResolver";

@Resolver(Contribution)
export class ContributionResolver {
  @Query(() => [AppUser])
  async getTopContributorsByScore(
    @Arg("limit", () => Int, { defaultValue: 10 }) limit: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AppUser[]> {
    return prisma.appUser.findMany({
      where: {
        contributionScore: {
          gt: 0,
        },
      },
      orderBy: {
        contributionScore: "desc",
      },
      take: limit,
    });
  }

  @Query(() => [Contribution])
  async getContentContributions(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    const contributions = await prisma.contribution.findMany({
      where: {
        contentId,
        status: { in: ["APPROVED", "AUTO_APPROVED"] },
      },
      include: {
        user: true,
        reviewer: true,
        content: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return contributions.map((c) => ({
      ...c,
      content: c.content ? {
        ...c.content,
        budget: c.content.budget?.toString(),
        revenue: c.content.revenue?.toString(),
      } : undefined,
    }));
  }

  @Authorized(["MODERATOR", "ADMIN"])
  @Query(() => [Contribution])
  async getPendingContributions(
    @Arg("limit", () => Int, { defaultValue: 20 }) limit: number,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    const contributions = await prisma.contribution.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: true,
        content: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      skip: offset,
    });

    return contributions.map((c) => ({
      ...c,
      content: c.content ? {
        ...c.content,
        budget: c.content.budget?.toString(),
        revenue: c.content.revenue?.toString(),
      } : undefined,
    }));
  }

  @Authorized()
  @Query(() => [Contribution])
  async myContributions(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<any[]> {
    if (!user) throw new Error("Not authenticated");
    const contributions = await prisma.contribution.findMany({
      where: {
        userId: user.id,
      },
      include: {
        user: true,
        reviewer: true,
        content: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return contributions.map((c) => ({
      ...c,
      content: c.content ? {
        ...c.content,
        budget: c.content.budget?.toString(),
        revenue: c.content.revenue?.toString(),
      } : undefined,
    }));
  }

  @Authorized()
  @Query(() => Contribution, { nullable: true })
  async getContribution(
    @Arg("id", () => Int) id: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<any | null> {
    if (!user) throw new Error("Not authenticated");
    const c = await prisma.contribution.findUnique({
      where: { id },
      include: { user: true, content: true },
    });
    if (!c) return null;
    if (c.userId !== user.id && !user.isAdmin && !user.isModerator) {
      throw new Error("Not authorized");
    }
    return {
      ...c,
      content: c.content ? {
        ...c.content,
        budget: c.content.budget?.toString(),
        revenue: c.content.revenue?.toString(),
      } : undefined,
    };
  }

  @Query(() => [Contribution])
  async getUserContributions(
    @Arg("username", () => String) username: string,
    @Arg("limit", () => Int, { defaultValue: 50 }) limit: number,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    const contributions = await prisma.contribution.findMany({
      where: {
        user: {
          username: username,
        },
        status: { in: ["APPROVED", "AUTO_APPROVED"] },
      },
      include: {
        user: true,
        content: true,
        reviewer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return contributions.map((c) => ({
      ...c,
      content: c.content ? {
        ...c.content,
        budget: c.content.budget?.toString(),
        revenue: c.content.revenue?.toString(),
      } : undefined,
    }));
  }

  @Authorized()
  @Mutation(() => Contribution)
  async createContribution(
    @Arg("type", () => String) type: string,
    @Arg("payload", () => GraphQLJSON) payload: any,
    @Arg("contentId", () => String, { nullable: true }) contentId: string | null,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Contribution> {
    if (!user) throw new Error("Not authenticated");
    if (type === "EDIT_CONTENT" && !contentId) {
      throw new Error("Content ID is required for edit contributions");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Contribution payload must be an object");
    }

    let status = "PENDING";
    let pointsEarned = 0;
    
    // Auto-approve if user is mod/admin
    if (user.isModerator || user.isAdmin) {
      status = "AUTO_APPROVED";
      // We can assign default points for direct edits, e.g. 1 point for edit, 20 for new.
      pointsEarned = type === "NEW_CONTENT" ? 20 : 1; 
    }

    const contribution = await prisma.contribution.create({
      data: {
        userId: user.id,
        contentId,
        type,
        status,
        payload: payload as any,
        pointsEarned,
      },
      include: {
        user: true,
      }
    });

    if (status === "AUTO_APPROVED" && pointsEarned > 0) {
      await prisma.appUser.update({
        where: { id: user.id },
        data: {
          contributionScore: {
            increment: pointsEarned
          }
        }
      });
    }

    return contribution;
  }

  @Authorized()
  @Mutation(() => Contribution)
  async updateContribution(
    @Arg("id", () => Int) id: number,
    @Arg("payload", () => GraphQLJSON) payload: any,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Contribution> {
    if (!user) throw new Error("Not authenticated");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Contribution payload must be an object");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.contribution.findUnique({ where: { id } });
      if (!existing) throw new Error("Contribution not found");
      if (existing.userId !== user.id) throw new Error("Not authorized");
      if (existing.status !== "PENDING") {
        throw new Error("Only pending contributions can be modified");
      }

      const result = await tx.contribution.updateMany({
        where: { id, userId: user.id, status: "PENDING" },
        data: { payload },
      });
      if (result.count !== 1) throw new Error("Contribution is already being reviewed");

      return tx.contribution.findUniqueOrThrow({
        where: { id },
        include: { user: true },
      });
    });

    return updated as unknown as Contribution;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteContribution(
    @Arg("id", () => Int) id: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const result = await prisma.contribution.deleteMany({
      where: { id, userId: user.id, status: "PENDING" },
    });
    if (result.count !== 1) {
      const existing = await prisma.contribution.findUnique({ where: { id }, select: { id: true } });
      if (!existing) throw new Error("Contribution not found");
      throw new Error("Only your pending contributions can be deleted");
    }
    return true;
  }

  @Authorized(["MODERATOR", "ADMIN"])
  @Mutation(() => Contribution)
  async reviewContribution(
    @Arg("id", () => Int) id: number,
    @Arg("status", () => String) status: string,
    @Arg("pointsEarned", () => Int, { defaultValue: 0 }) pointsEarned: number,
    @Arg("updatedPayload", () => GraphQLJSON, { nullable: true }) updatedPayload: any | null,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Contribution> {
    if (!user) throw new Error("Not authenticated");
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Invalid contribution status");
    }

    const existing = await prisma.contribution.findUnique({ where: { id } });
    if (!existing) throw new Error("Contribution not found");
    if (existing.status !== "PENDING") throw new Error("Contribution is already reviewed");

    // Claim the pending row atomically so two reviewers cannot apply the same
    // contribution, points, or notification at the same time.
    const claimed = await prisma.contribution.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) throw new Error("Contribution is already being reviewed");

    try {
      const dataToUpdate: any = {
        status,
        reviewedById: user.id,
        reviewedAt: new Date(),
      };

      if (status === "APPROVED") {
      dataToUpdate.pointsEarned = pointsEarned;
      if (updatedPayload) {
        dataToUpdate.payload = updatedPayload;
      }

      // Auto-apply EDIT_CONTENT changes
      if (existing.type === "EDIT_CONTENT" && existing.contentId) {
        try {
          const adminResolver = new AdminContentMutationResolver();
          const payload = updatedPayload || existing.payload;
          const finalPayload = payload?.__updateInput || payload;
          
          await adminResolver.updateContent(
            existing.contentId,
            finalPayload as any,
            { user, prisma } as GraphQLContext
          );
        } catch (err: any) {
          console.error("Failed to auto-apply EDIT_CONTENT contribution:", err);
          throw new Error(`Değişiklikleri uygularken hata oluştu: ${err.message}`);
        }
      }
      }

      const contribution = await prisma.contribution.update({
        where: { id },
        data: {
          ...dataToUpdate,
          ...(updatedPayload ? { payload: updatedPayload } : {}),
        },
        include: {
          user: true,
        }
      });

      if (status === "APPROVED" && pointsEarned > 0) {
      await prisma.appUser.update({
        where: { id: existing.userId },
        data: {
          contributionScore: { increment: pointsEarned }
        }
      });
      }

    // Give reviewer 1 point for reviewing
      await prisma.appUser.update({
        where: { id: user.id },
        data: {
          contributionScore: { increment: 1 }
        }
      });

    // Send notification
      const { createNotification } = await import("../lib/notifications");
      const { NOTIFICATION_TYPE_ID } = await import("../lib/notificationTypes");
    
      let rejectionReason;
      if (status === "REJECTED" && updatedPayload && updatedPayload.rejectionReason) {
        rejectionReason = updatedPayload.rejectionReason;
      }

      await createNotification(prisma, {
        recipientUserId: existing.userId,
        actorUserId: user.id,
        typeId: status === "APPROVED" ? NOTIFICATION_TYPE_ID.CONTRIBUTION_APPROVED : NOTIFICATION_TYPE_ID.CONTRIBUTION_REJECTED,
        message: rejectionReason,
        contentId: existing.contentId,
      });

      return contribution;
    } catch (error) {
      await prisma.contribution.update({
        where: { id },
        data: { status: "PENDING" },
      }).catch(() => Promise.resolve());
      throw error;
    }
  }
}
