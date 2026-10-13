import {
  Resolver,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  ObjectType,
  Field,
  Int,
  Query,
} from "type-graphql";
import { GraphQLContext } from "../context";
import { logger } from "../lib/logger";
import { AppUser } from "../types/User";

@ObjectType()
export class Report {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  reporterId: string;

  @Field(() => AppUser, { nullable: true })
  reporter?: AppUser;

  @Field(() => String)
  targetType: string;

  @Field(() => String)
  targetId: string;

  @Field(() => String)
  reason: string;

  @Field(() => String)
  status: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@Resolver()
export class ReportResolver {
  /**
   * Creates a new report.
   */
  @Authorized()
  @Mutation(() => Report)
  async createReport(
    @Arg("targetType", () => String) targetType: string,
    @Arg("targetId", () => String) targetId: string,
    @Arg("reason", () => String) reason: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Report> {
    if (!user) throw new Error("Unauthorized");

    logger.info(`[Report] User ${user.id} is reporting ${targetType} ${targetId}`);

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        targetType,
        targetId,
        reason,
        status: "pending",
      },
    });

    return report;
  }

  /**
   * Gets all reports (Admin/Moderator only).
   */
  @Authorized(["MODERATOR", "ADMIN"])
  @Query(() => [Report])
  async getReports(
    @Arg("status", () => String, { nullable: true }) status: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Report[]> {
    const where = status ? { status } : {};
    return prisma.report.findMany({
      where,
      include: { reporter: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }) as unknown as Promise<Report[]>;
  }

  /**
   * Updates report status (Admin/Moderator only).
   */
  @Authorized(["MODERATOR", "ADMIN"])
  @Mutation(() => Report)
  async updateReportStatus(
    @Arg("reportId", () => Int) reportId: number,
    @Arg("status", () => String) status: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Report> {
    const validStatuses = ["pending", "resolved", "rejected"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    logger.info(`[Report] Updating report ${reportId} to status ${status}`);

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status },
      include: { reporter: true },
    });

    return report as unknown as Report;
  }
}
