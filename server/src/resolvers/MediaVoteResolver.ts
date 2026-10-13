import {
  Resolver,
  Mutation,
  Arg,
  Int,
  Ctx,
  FieldResolver,
  Root,
} from "type-graphql";
import { GraphQLContext as Context } from "../context";
import { ContentImage } from "../types/ContentImage";
import { ContentScreenshot } from "../types/Quiz";

const MEDIA_VOTE_TRANSACTION_TIMEOUT = 15_000;

@Resolver()
export class MediaVoteResolver {
  @Mutation(() => ContentImage)
  async voteImage(
    @Arg("imageId", () => Int) imageId: number,
    @Arg("voteType", () => Int) voteType: number,
    @Ctx() { prisma, user }: Context,
  ): Promise<ContentImage> {
    if (!user) throw new Error("Not authenticated");

    // validate voteType
    if (![-1, 0, 1].includes(voteType)) {
      throw new Error("Invalid vote type. Must be -1, 0, or 1.");
    }

    return prisma.$transaction(
      async (transaction) => {
        const prisma = transaction;
        await prisma.$queryRaw`SELECT c.id FROM content c JOIN content_image i ON i.content_id = c.id WHERE i.id = ${imageId} FOR UPDATE OF c`;
        const image = await prisma.contentImage.findUnique({
          where: { id: imageId },
          include: { content: true },
        });

        if (!image) throw new Error("Image not found");

        const existingVote = await prisma.userImageVote.findUnique({
          where: { imageId_userId: { imageId, userId: user.id } },
        });

        let upVoteDiff = 0;
        let downVoteDiff = 0;

        if (existingVote) {
          if (existingVote.voteType === 1) upVoteDiff--;
          if (existingVote.voteType === -1) downVoteDiff--;

          if (voteType === 0) {
            await prisma.userImageVote.delete({
              where: { id: existingVote.id },
            });
          } else {
            await prisma.userImageVote.update({
              where: { id: existingVote.id },
              data: { voteType },
            });
            if (voteType === 1) upVoteDiff++;
            if (voteType === -1) downVoteDiff++;
          }
        } else if (voteType !== 0) {
          await prisma.userImageVote.create({
            data: {
              imageId,
              userId: user.id,
              voteType,
            },
          });
          if (voteType === 1) upVoteDiff++;
          if (voteType === -1) downVoteDiff++;
        }

        const updatedImage = await prisma.contentImage.update({
          where: { id: imageId },
          data: {
            upvoteCount: { increment: upVoteDiff },
            downvoteCount: { increment: downVoteDiff },
          },
        });

        // Auto select highest voted media logic
        if (image.content.autoSelectHighestVotedMedia) {
          const allImagesOfType = await prisma.contentImage.findMany({
            where: { contentId: image.contentId, type: image.type },
          });

          let highestImage = allImagesOfType[0];
          for (const img of allImagesOfType) {
            // use updated values for the current image
            const imgUp =
              img.id === imageId ? updatedImage.upvoteCount : img.upvoteCount;
            const imgDown =
              img.id === imageId
                ? updatedImage.downvoteCount
                : img.downvoteCount;
            const score = imgUp - imgDown;

            const highestUp =
              highestImage.id === imageId
                ? updatedImage.upvoteCount
                : highestImage.upvoteCount;
            const highestDown =
              highestImage.id === imageId
                ? updatedImage.downvoteCount
                : highestImage.downvoteCount;
            const highestScore = highestUp - highestDown;

            if (score > highestScore) {
              highestImage = img;
            } else if (score === highestScore) {
              if (imgUp > highestUp) highestImage = img;
              else if (imgUp === highestUp && img.id > highestImage.id)
                highestImage = img; // newer wins tie
            }
          }

          if (
            image.type === "poster" &&
            image.content.posterImageId !== highestImage.id
          ) {
            await prisma.content.update({
              where: { id: image.contentId },
              data: { posterImageId: highestImage.id },
            });
          } else if (
            image.type === "backdrop" &&
            image.content.backdropImageId !== highestImage.id
          ) {
            await prisma.content.update({
              where: { id: image.contentId },
              data: { backdropImageId: highestImage.id },
            });
          }
        }

        return Object.assign({}, updatedImage, { userVote: voteType });
      },
      { timeout: MEDIA_VOTE_TRANSACTION_TIMEOUT },
    );
  }

  @Mutation(() => ContentScreenshot)
  async voteScreenshot(
    @Arg("screenshotId", () => Int) screenshotId: number,
    @Arg("voteType", () => Int) voteType: number,
    @Ctx() { prisma, user }: Context,
  ): Promise<ContentScreenshot> {
    if (!user) throw new Error("Not authenticated");

    // validate voteType
    if (![-1, 0, 1].includes(voteType)) {
      throw new Error("Invalid vote type. Must be -1, 0, or 1.");
    }

    return prisma.$transaction(
      async (transaction) => {
        const prisma = transaction;
        await prisma.$queryRaw`SELECT id FROM content_screenshot WHERE id = ${screenshotId} FOR UPDATE`;
        const screenshot = await prisma.contentScreenshot.findUnique({
          where: { id: screenshotId },
        });

        if (!screenshot) throw new Error("Screenshot not found");

        const existingVote = await prisma.userScreenshotVote.findUnique({
          where: { screenshotId_userId: { screenshotId, userId: user.id } },
        });

        let upVoteDiff = 0;
        let downVoteDiff = 0;

        if (existingVote) {
          if (existingVote.voteType === 1) upVoteDiff--;
          if (existingVote.voteType === -1) downVoteDiff--;

          if (voteType === 0) {
            await prisma.userScreenshotVote.delete({
              where: { id: existingVote.id },
            });
          } else {
            await prisma.userScreenshotVote.update({
              where: { id: existingVote.id },
              data: { voteType },
            });
            if (voteType === 1) upVoteDiff++;
            if (voteType === -1) downVoteDiff++;
          }
        } else if (voteType !== 0) {
          await prisma.userScreenshotVote.create({
            data: {
              screenshotId,
              userId: user.id,
              voteType,
            },
          });
          if (voteType === 1) upVoteDiff++;
          if (voteType === -1) downVoteDiff++;
        }

        const updatedScreenshot = await prisma.contentScreenshot.update({
          where: { id: screenshotId },
          data: {
            upvoteCount: { increment: upVoteDiff },
            downvoteCount: { increment: downVoteDiff },
          },
        });

        return Object.assign({}, updatedScreenshot, { userVote: voteType });
      },
      { timeout: MEDIA_VOTE_TRANSACTION_TIMEOUT },
    );
  }
}

@Resolver(() => ContentImage)
export class ContentImageFieldResolver {
  @FieldResolver(() => Int, { nullable: true })
  async userVote(
    @Root() image: ContentImage,
    @Ctx() { prisma, user }: Context,
  ): Promise<number | null> {
    if (!user) return null;
    // If it was already populated (e.g. from mutation return), use it
    if ((image as any).userVote !== undefined) {
      return (image as any).userVote;
    }
    const vote = await prisma.userImageVote.findUnique({
      where: { imageId_userId: { imageId: image.id, userId: user.id } },
    });
    return vote ? vote.voteType : null;
  }
}

@Resolver(() => ContentScreenshot)
export class ContentScreenshotFieldResolver {
  @FieldResolver(() => Int, { nullable: true })
  async userVote(
    @Root() screenshot: ContentScreenshot,
    @Ctx() { prisma, user }: Context,
  ): Promise<number | null> {
    if (!user) return null;
    // If it was already populated, use it
    if ((screenshot as any).userVote !== undefined) {
      return (screenshot as any).userVote;
    }
    const vote = await prisma.userScreenshotVote.findUnique({
      where: {
        screenshotId_userId: { screenshotId: screenshot.id, userId: user.id },
      },
    });
    return vote ? vote.voteType : null;
  }
}
