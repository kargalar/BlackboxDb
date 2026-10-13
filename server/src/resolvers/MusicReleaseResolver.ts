import { MusicReleaseType } from "@prisma/client";
import { Authorized, Arg, Ctx, Field, InputType, Int, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import { GraphQLContext } from "../context";
import { requireAdmin } from "../lib/authGuard";

registerEnumType(MusicReleaseType, { name: "MusicReleaseType" });

@InputType()
class MusicTrackInput {
  @Field(() => String) trackContentId: string;
  @Field(() => Int) discNumber: number;
  @Field(() => Int) trackNumber: number;
}

@ObjectType()
class MusicTrackEntry {
  @Field(() => String) trackContentId: string;
  @Field(() => String) title: string;
  @Field(() => Int) discNumber: number;
  @Field(() => Int) trackNumber: number;
  @Field(() => String, { nullable: true }) spotifyUrl?: string | null;
  @Field(() => Int, { nullable: true }) durationMinutes?: number | null;
}

@ObjectType()
class MusicReleaseDetails {
  @Field(() => String) contentId: string;
  @Field(() => MusicReleaseType, { nullable: true }) releaseType?: MusicReleaseType | null;
  @Field(() => [MusicTrackEntry]) tracks: MusicTrackEntry[];
}

@Resolver()
export class MusicReleaseResolver {
  @Query(() => MusicReleaseDetails, { nullable: true })
  async musicReleaseDetails(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<MusicReleaseDetails | null> {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        musicReleaseType: true,
        contentType: { select: { slug: true } },
        musicReleaseTracks: {
          include: { track: { select: { id: true, title: true, spotifyUrl: true, runtime: true } } },
          orderBy: [{ discNumber: "asc" }, { trackNumber: "asc" }],
        },
      },
    });
    if (!content || content.contentType.slug !== "music") return null;
    return {
      contentId: content.id,
      releaseType: content.musicReleaseType,
      tracks: content.musicReleaseTracks.map((entry) => ({
        trackContentId: entry.track.id,
        title: entry.track.title,
        discNumber: entry.discNumber,
        trackNumber: entry.trackNumber,
        spotifyUrl: entry.track.spotifyUrl,
        durationMinutes: entry.track.runtime,
      })),
    };
  }

  @Authorized()
  @Mutation(() => MusicReleaseDetails)
  async saveMusicReleaseDetails(
    @Arg("contentId", () => String) contentId: string,
    @Arg("releaseType", () => MusicReleaseType) releaseType: MusicReleaseType,
    @Arg("tracks", () => [MusicTrackInput], { nullable: true }) tracks: MusicTrackInput[] | undefined,
    @Ctx() context: GraphQLContext,
  ): Promise<MusicReleaseDetails> {
    requireAdmin(context.user);
    const content = await context.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, contentType: { select: { slug: true } } },
    });
    if (!content || content.contentType.slug !== "music") throw new Error("A music catalog item is required");
    const normalizedTracks = tracks || [];
    if (releaseType === "TRACK" && normalizedTracks.length > 0) throw new Error("Track items cannot contain child tracks");
    const positions = new Set<string>();
    for (const track of normalizedTracks) {
      if (track.trackContentId === contentId) throw new Error("A release cannot contain itself");
      if (!Number.isInteger(track.discNumber) || track.discNumber < 1 || !Number.isInteger(track.trackNumber) || track.trackNumber < 1) {
        throw new Error("Disc and track positions must be positive integers");
      }
      const position = `${track.discNumber}:${track.trackNumber}`;
      if (positions.has(position)) throw new Error("Track positions must be unique within a release");
      positions.add(position);
    }
    if (normalizedTracks.length) {
      const trackContents = await context.prisma.content.findMany({
        where: { id: { in: [...new Set(normalizedTracks.map((track) => track.trackContentId))] } },
        select: { id: true, musicReleaseType: true, contentType: { select: { slug: true } } },
      });
      const validTrackIds = new Set(trackContents.filter((item) => item.contentType.slug === "music" && item.musicReleaseType === "TRACK").map((item) => item.id));
      if (validTrackIds.size !== new Set(normalizedTracks.map((track) => track.trackContentId)).size) {
        throw new Error("Every linked item must be cataloged as a music track");
      }
    }
    await context.prisma.$transaction(async (tx) => {
      await tx.content.update({ where: { id: contentId }, data: { musicReleaseType: releaseType } });
      await tx.musicReleaseTrack.deleteMany({ where: { releaseContentId: contentId } });
      if (normalizedTracks.length) {
        await tx.musicReleaseTrack.createMany({
          data: normalizedTracks.map((track) => ({
            releaseContentId: contentId,
            trackContentId: track.trackContentId,
            discNumber: track.discNumber,
            trackNumber: track.trackNumber,
          })),
        });
      }
    });
    return (await this.musicReleaseDetails(contentId, context))!;
  }
}
