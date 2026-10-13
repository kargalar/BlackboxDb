import {
  Resolver,
  Query,
  Arg,
  Ctx,
  Authorized,
  ObjectType,
  Field,
  Int,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import { logger } from "../../lib/logger";

@ObjectType()
export class ImportJobStatus {
  @Field(() => String)
  id: string;

  @Field(() => String)
  status: string;

  @Field(() => Int)
  totalItems: number;

  @Field(() => Int)
  processedItems: number;

  @Field(() => String, { nullable: true })
  currentItem?: string;

  @Field(() => [String])
  errors: string[];
}

@Resolver()
export class ImportQueryResolver {
  private async recoverStaleJobs(prisma: GraphQLContext["prisma"]): Promise<void> {
    const staleBefore = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await prisma.importJob.updateMany({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        updatedAt: { lt: staleBefore },
      },
      data: {
        status: "FAILED",
        errors: { push: "İçe aktarma işlemi zaman aşımı nedeniyle sonlandırıldı." },
        updatedAt: new Date(),
      },
    });
  }

  // ─── IMPORT JOB STATUS QUERY ───
  @Authorized()
  @Query(() => ImportJobStatus, { nullable: true })
  async getImportJobStatus(
    @Arg("jobId", () => String) jobId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<ImportJobStatus | null> {
    if (!user) throw new Error("Not authenticated");
    await this.recoverStaleJobs(prisma);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return null;
    }
 
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== user.id) {
      return null;
    }

    return {
      id: job.id,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      errors: job.errors,
      currentItem: job.currentItem || undefined,
    };
  }

  @Authorized() // Original had @Query but didn't have @Authorized on getActiveImportJob, wait, let's look: it starts with if (!user) throw new Error("Not authenticated"); so it must be Authorized or authenticated. Let's make it @Authorized() to match.
  @Query(() => ImportJobStatus, { nullable: true })
  async getActiveImportJob(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<ImportJobStatus | null> {
    if (!user) throw new Error("Not authenticated");
    await this.recoverStaleJobs(prisma);

    const job = await prisma.importJob.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      errors: job.errors,
      currentItem: job.currentItem || undefined,
    };
  }
}
