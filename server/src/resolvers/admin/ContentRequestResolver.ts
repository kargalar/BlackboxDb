import {
    Resolver,
    Query,
    Mutation,
    Arg,
    Ctx,
    Authorized,
    Int,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import { requireAdminOrModerator } from "../../lib/authGuard";
import { logger } from "../../lib/logger";
import { createNotification } from "../../lib/notifications";
import { NOTIFICATION_TYPE_ID } from "../../lib/notificationTypes";
import { ContentRequest } from "../../types/admin";
import { CreateContentRequestInput } from "../../types/admin";

@Resolver()
export class ContentRequestResolver {
    private async getEditableRequestOrThrow(
        prisma: GraphQLContext["prisma"],
        requestId: number,
        userId: string,
    ) {
        const request = await prisma.contentRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            throw new Error("Content request not found");
        }

        if (request.requesterUserId !== userId) {
            throw new Error("Not authorized");
        }

        if (request.status !== "pending") {
            throw new Error("Only pending content requests can be modified");
        }

        return request;
    }

    /**
     * Create a new content request (any authenticated user).
     */
    @Authorized()
    @Mutation(() => ContentRequest)
    async createContentRequest(
        @Arg("input", () => CreateContentRequestInput) input: CreateContentRequestInput,
        @Ctx() { user, prisma }: GraphQLContext,
    ): Promise<ContentRequest> {
        logger.info(
            `[ContentRequest] User ${user!.id} creating request: ${input.title}`,
        );

        const created = await prisma.contentRequest.create({
            data: {
                requesterUserId: user!.id,
                title: input.title,
                contentTypeId: input.contentTypeId,
                releaseDate: input.releaseDate ?? null,
                description: input.description ?? null,
                reason: input.reason ?? null,
                payload: input.payload ? (input.payload as any) : undefined,
                status: "pending",
            },
        });

        return created as unknown as ContentRequest;
    }

    /**
     * List current user's content requests.
     */
    @Authorized()
    @Query(() => [ContentRequest])
    async myContentRequests(
        @Ctx() { user, prisma }: GraphQLContext,
    ): Promise<ContentRequest[]> {
        logger.info(`[ContentRequest] Fetching requests for user ${user!.id}`);

        const requests = await prisma.contentRequest.findMany({
            where: { requesterUserId: user!.id },
            orderBy: { createdAt: "desc" },
        });

        return requests as unknown as ContentRequest[];
    }

    /**
     * Get a single content request by ID (authenticated user).
     */
    @Authorized()
    @Query(() => ContentRequest, { nullable: true })
    async contentRequest(
        @Arg("id", () => Int) id: number,
        @Ctx() { user, prisma }: GraphQLContext,
    ): Promise<ContentRequest | null> {
        const request = await prisma.contentRequest.findUnique({
            where: { id },
        });

        if (!request) return null;

        const canAccess =
            !!user &&
            (request.requesterUserId === user.id ||
                user.isAdmin ||
                user.isModerator);

        if (!canAccess) {
            throw new Error("Not authorized");
        }

        return (request as unknown as ContentRequest) ?? null;
    }

    /**
     * List all pending content requests (admin/moderator only).
     */
    @Authorized()
    @Query(() => [ContentRequest])
    async pendingContentRequests(
        @Ctx() { user, prisma }: GraphQLContext,
    ): Promise<ContentRequest[]> {
        requireAdminOrModerator(user);

        logger.info("[ContentRequest] Fetching pending content requests");

        const requests = await prisma.contentRequest.findMany({
            where: { status: "pending" },
            orderBy: { createdAt: "desc" },
        });

        return requests as unknown as ContentRequest[];
    }

    /**
     * Update a pending content request owned by the current user.
     */
    @Authorized()
    @Mutation(() => ContentRequest)
    async updateContentRequest(
        @Arg("id", () => Int) id: number,
        @Arg("input", () => CreateContentRequestInput) input: CreateContentRequestInput,
        @Ctx() { user, prisma }: GraphQLContext,
    ): Promise<ContentRequest> {
        await this.getEditableRequestOrThrow(prisma, id, user!.id);

        logger.info(`[ContentRequest] User ${user!.id} updating request ID: ${id}`);

        const updated = await prisma.contentRequest.update({
            where: { id },
            data: {
                title: input.title,
                contentTypeId: input.contentTypeId,
                releaseDate: input.releaseDate ?? null,
                description: input.description ?? null,
                reason: input.reason ?? null,
                payload: input.payload ? (input.payload as any) : undefined,
                status: "pending",
                reviewedBy: null,
                reviewedAt: null,
            },
        });

        return updated as unknown as ContentRequest;
    }

    /**
     * Delete a pending content request owned by the current user.
     */
    @Authorized()
    @Mutation(() => Boolean)
    async deleteContentRequest(
        @Arg("id", () => Int) id: number,
        @Ctx() { user, prisma }: GraphQLContext,
    ): Promise<boolean> {
        await this.getEditableRequestOrThrow(prisma, id, user!.id);

        logger.info(`[ContentRequest] User ${user!.id} deleting request ID: ${id}`);

        await prisma.contentRequest.delete({
            where: { id },
        });

        return true;
    }

    /**
     * Approve a content request (admin/moderator only).
     */
    @Authorized()
    @Mutation(() => Boolean)
    async approveContentRequest(
        @Arg("id", () => Int) id: number,
        @Arg("contentId", () => String, { nullable: true }) contentId: string | null,
        @Ctx() { user, prisma }: GraphQLContext,
    ): Promise<boolean> {
        requireAdminOrModerator(user);

        logger.info(`[ContentRequest] Approving request ID: ${id}, contentId: ${contentId}`);

        return prisma.$transaction(async (tx) => {
            const existing = await tx.contentRequest.findUnique({ where: { id } });
            if (!existing) throw new Error("Content request not found");
            if (existing.status !== "pending") throw new Error("Content request is already reviewed");

            const currentPayload = existing.payload && typeof existing.payload === "object"
                ? (existing.payload as any)
                : {};
            const updatedPayload = { ...currentPayload, contentId: contentId || undefined };
            const reviewedAt = new Date();
            const claimed = await tx.contentRequest.updateMany({
                where: { id, status: "pending" },
                data: {
                    status: "approved",
                    reviewedBy: user!.id,
                    reviewedAt,
                    payload: updatedPayload,
                },
            });
            if (claimed.count !== 1) throw new Error("Content request is already reviewed");

            if (contentId) {
                await tx.contribution.create({
                    data: {
                        userId: existing.requesterUserId,
                        type: "NEW_CONTENT",
                        status: "APPROVED",
                        contentId,
                        pointsEarned: 20,
                        reviewedById: user!.id,
                        reviewedAt,
                        payload: {},
                    },
                });
                await tx.appUser.update({
                    where: { id: existing.requesterUserId },
                    data: { contributionScore: { increment: 20 } },
                });
                await tx.appUser.update({
                    where: { id: user!.id },
                    data: { contributionScore: { increment: 1 } },
                });
            }

            await createNotification(tx, {
                recipientUserId: existing.requesterUserId,
                actorUserId: user!.id,
                typeId: NOTIFICATION_TYPE_ID.CONTENT_REQUEST_APPROVED,
                contentId: contentId || undefined,
            });

            return true;
        });
    }

    /**
     * Reject a content request (admin/moderator only).
     */
    @Authorized()
    @Mutation(() => Boolean)
    async rejectContentRequest(
        @Arg("id", () => Int) id: number,
        @Arg("reason", () => String, { nullable: true }) reason: string | null,
        @Ctx() { user, prisma }: GraphQLContext,
    ): Promise<boolean> {
        requireAdminOrModerator(user);

        logger.info(`[ContentRequest] Rejecting request ID: ${id}`);

        return prisma.$transaction(async (tx) => {
            const existing = await tx.contentRequest.findUnique({ where: { id } });
            if (!existing) throw new Error("Content request not found");
            if (existing.status !== "pending") throw new Error("Content request is already reviewed");

            const claimed = await tx.contentRequest.updateMany({
                where: { id, status: "pending" },
                data: {
                    status: "rejected",
                    reviewedBy: user!.id,
                    reviewedAt: new Date(),
                    reason: reason ?? undefined,
                },
            });
            if (claimed.count !== 1) throw new Error("Content request is already reviewed");

            await createNotification(tx, {
                recipientUserId: existing.requesterUserId,
                actorUserId: user!.id,
                typeId: NOTIFICATION_TYPE_ID.CONTENT_REQUEST_REJECTED,
                message: reason?.trim() || null,
            });

            return true;
        });
    }
}
