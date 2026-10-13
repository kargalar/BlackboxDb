import {
  Arg,
  Authorized,
  Ctx,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import GraphQLJSON from "graphql-type-json";
import { GraphQLContext } from "../context";
import { requireAdmin, requireAuth } from "../lib/authGuard";

@ObjectType()
class PodcastEpisodePayload {
  @Field(() => String) id: string;
  @Field(() => String) programId: string;
  @Field(() => Int) seasonNumber: number;
  @Field(() => Int) episodeNumber: number;
  @Field(() => String) title: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => Date, { nullable: true }) publishedAt?: Date | null;
  @Field(() => Int, { nullable: true }) durationSeconds?: number | null;
  @Field(() => String, { nullable: true }) audioUrl?: string | null;
  @Field(() => Boolean, { nullable: true }) isExplicit?: boolean | null;
  @Field(() => Int) listenCount: number;
  @Field(() => Int) myListenCount: number;
  @Field(() => GraphQLJSON) credits: unknown[];
  @Field(() => GraphQLJSON) recentListens: unknown[];
}

@ObjectType()
class PodcastProgramPayload {
  @Field(() => String) id: string;
  @Field(() => String) contentId: string;
  @Field(() => String) title: string;
  @Field(() => String, { nullable: true }) posterUrl?: string | null;
  @Field(() => String) publicationStatus: string;
  @Field(() => String, { nullable: true }) languageCode?: string | null;
  @Field(() => String, { nullable: true }) releaseFrequency?: string | null;
  @Field(() => Int, { nullable: true }) releaseInterval?: number | null;
  @Field(() => [Int]) releaseWeekdays: number[];
  @Field(() => GraphQLJSON) credits: unknown[];
  @Field(() => [PodcastEpisodePayload]) episodes: PodcastEpisodePayload[];
}

@ObjectType()
class PodcastListenPayload {
  @Field(() => Int) id: number;
  @Field(() => String) episodeId: string;
  @Field(() => Date) listenedAt: Date;
  @Field(() => Int, { nullable: true }) secondsListened?: number | null;
  @Field(() => Boolean) completed: boolean;
}

@ObjectType()
class MediaEventPayload {
  @Field(() => String) id: string;
  @Field(() => String) eventType: string;
  @Field(() => String, { nullable: true }) theaterProductionId?: string | null;
  @Field(() => String, { nullable: true }) title?: string | null;
  @Field(() => Date) startsAt: Date;
  @Field(() => String) timeZone: string;
  @Field(() => String) venueName: string;
  @Field(() => String) city: string;
  @Field(() => String, { nullable: true }) address?: string | null;
  @Field(() => String) status: string;
  @Field(() => String, { nullable: true }) rescheduledFromId?: string | null;
  @Field(() => GraphQLJSON, { nullable: true }) theaterProduction?: unknown;
  @Field(() => GraphQLJSON) credits: unknown[];
  @Field(() => Int) attendanceCount: number;
  @Field(() => Boolean) attendedByMe: boolean;
}

const PODCAST_PROGRAM_INCLUDE = {
  content: { select: { id: true, title: true, images: { where: { type: "poster" }, take: 1, orderBy: { id: "asc" }, select: { filePath: true } } } },
  credits: { include: { person: { select: { id: true, name: true, profileUrl: true } } }, orderBy: { position: "asc" } },
  episodes: { include: { credits: { include: { person: { select: { id: true, name: true, profileUrl: true } } }, orderBy: { position: "asc" } } }, orderBy: [{ seasonNumber: "desc" }, { episodeNumber: "desc" }] },
} as const;

const MEDIA_EVENT_INCLUDE = {
  theaterProduction: { select: { id: true, title: true, contentType: { select: { slug: true } }, images: { where: { type: "poster" }, take: 1, orderBy: { id: "asc" }, select: { filePath: true } } } },
  credits: { include: { person: { select: { id: true, name: true, profileUrl: true } } }, orderBy: { position: "asc" } },
  _count: { select: { attendances: true } },
} as const;

@Resolver()
export class MediaResolver {
  @Query(() => PodcastProgramPayload, { nullable: true })
  async podcastProgram(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<PodcastProgramPayload | null> {
    const program = await prisma.podcastProgram.findUnique({ where: { contentId }, include: PODCAST_PROGRAM_INCLUDE as any });
    if (!program) return null;
    const type = await prisma.content.findUnique({ where: { id: contentId }, select: { contentType: { select: { slug: true } } } });
    if (type?.contentType.slug !== "podcast") return null;
    return this.mapProgram(program as any, user?.id, prisma);
  }

  @Query(() => PodcastEpisodePayload, { nullable: true })
  async podcastEpisode(
    @Arg("episodeId", () => String) episodeId: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<PodcastEpisodePayload | null> {
    const episode = await prisma.podcastEpisode.findUnique({
      where: { id: episodeId },
      include: { credits: { include: { person: { select: { id: true, name: true, profileUrl: true } } }, orderBy: { position: "asc" } } },
    });
    return episode ? this.mapEpisode(episode as any, user?.id, prisma) : null;
  }

  @Authorized()
  @Mutation(() => PodcastProgramPayload)
  async savePodcastProgram(
    @Arg("contentId", () => String) contentId: string,
    @Arg("publicationStatus", () => String, { defaultValue: "ongoing" }) publicationStatus: string,
    @Arg("languageCode", () => String, { nullable: true }) languageCode: string | undefined,
    @Arg("releaseFrequency", () => String, { nullable: true }) releaseFrequency: string | undefined,
    @Arg("releaseInterval", () => Int, { nullable: true }) releaseInterval: number | undefined,
    @Arg("releaseWeekdays", () => [Int], { nullable: true }) releaseWeekdays: number[] | undefined,
    @Arg("hostPersonIds", () => [String], { nullable: true }) hostPersonIds: string[] | undefined,
    @Ctx() context: GraphQLContext,
  ): Promise<PodcastProgramPayload> {
    requireAdmin(context.user);
    const normalizedStatus = publicationStatus.trim().toLowerCase();
    if (!["ongoing", "hiatus", "completed", "cancelled"].includes(normalizedStatus)) throw new Error("Invalid podcast publication status");
    validateWeekdays(releaseWeekdays || []);
    if (releaseInterval !== undefined && releaseInterval < 1) throw new Error("Release interval must be positive");
    const content = await context.prisma.content.findUnique({ where: { id: contentId }, select: { id: true, contentType: { select: { slug: true } } } });
    if (!content || content.contentType.slug !== "podcast") throw new Error("A podcast catalog item is required");
    const hostIds = [...new Set(hostPersonIds || [])];
    await assertPeopleExist(context.prisma, hostIds);
    const saved = await context.prisma.$transaction(async (tx) => {
      const program = await tx.podcastProgram.upsert({
        where: { contentId },
        create: { contentId, publicationStatus: normalizedStatus, languageCode, releaseFrequency, releaseInterval, releaseWeekdays: releaseWeekdays || [] },
        update: { publicationStatus: normalizedStatus, languageCode, releaseFrequency, releaseInterval, releaseWeekdays: releaseWeekdays || [] },
      });
      await tx.podcastProgramCredit.deleteMany({ where: { programId: program.id, role: "host" } });
      if (hostIds.length) await tx.podcastProgramCredit.createMany({ data: hostIds.map((personId, position) => ({ programId: program.id, personId, role: "host", position })) });
      return tx.podcastProgram.findUniqueOrThrow({ where: { id: program.id }, include: PODCAST_PROGRAM_INCLUDE as any });
    });
    return this.mapProgram(saved as any, context.user?.id, context.prisma);
  }

  @Authorized()
  @Mutation(() => PodcastEpisodePayload)
  async savePodcastEpisode(
    @Arg("programId", () => String) programId: string,
    @Arg("title", () => String) title: string,
    @Arg("seasonNumber", () => Int, { defaultValue: 1 }) seasonNumber: number,
    @Arg("episodeNumber", () => Int) episodeNumber: number,
    @Arg("description", () => String, { nullable: true }) description: string | undefined,
    @Arg("publishedAt", () => Date, { nullable: true }) publishedAt: Date | undefined,
    @Arg("durationSeconds", () => Int, { nullable: true }) durationSeconds: number | undefined,
    @Arg("audioUrl", () => String, { nullable: true }) audioUrl: string | undefined,
    @Arg("externalGuid", () => String, { nullable: true }) externalGuid: string | undefined,
    @Arg("isExplicit", () => Boolean, { nullable: true }) isExplicit: boolean | undefined,
    @Arg("guestPersonIds", () => [String], { nullable: true }) guestPersonIds: string[] | undefined,
    @Arg("episodeId", () => String, { nullable: true }) episodeId: string | undefined,
    @Ctx() context: GraphQLContext,
  ): Promise<PodcastEpisodePayload> {
    requireAdmin(context.user);
    if (!title.trim() || title.trim().length > 255) throw new Error("Episode title is required and must not exceed 255 characters");
    if (seasonNumber < 1 || episodeNumber < 1) throw new Error("Season and episode numbers must be positive");
    if (durationSeconds !== undefined && durationSeconds < 1) throw new Error("Episode duration must be positive");
    const program = await context.prisma.podcastProgram.findUnique({ where: { id: programId } });
    if (!program) throw new Error("Podcast program not found");
    const guestIds = [...new Set(guestPersonIds || [])];
    await assertPeopleExist(context.prisma, guestIds);
    const data = { title: title.trim(), seasonNumber, episodeNumber, description, publishedAt, durationSeconds, audioUrl: normalizeOptionalUrl(audioUrl), externalGuid: externalGuid?.trim() || null, isExplicit };
    const saved = await context.prisma.$transaction(async (tx) => {
      const episode = episodeId
        ? await tx.podcastEpisode.update({ where: { id: episodeId, programId } as any, data })
        : await tx.podcastEpisode.create({ data: { ...data, programId } });
      await tx.podcastEpisodeCredit.deleteMany({ where: { episodeId: episode.id, role: "guest" } });
      if (guestIds.length) await tx.podcastEpisodeCredit.createMany({ data: guestIds.map((personId, position) => ({ episodeId: episode.id, personId, role: "guest", position })) });
      return tx.podcastEpisode.findUniqueOrThrow({ where: { id: episode.id }, include: { credits: { include: { person: true }, orderBy: { position: "asc" } } } });
    });
    return this.mapEpisode(saved as any, context.user?.id, context.prisma);
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deletePodcastEpisode(
    @Arg("episodeId", () => String) episodeId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<boolean> {
    requireAdmin(context.user);
    await context.prisma.podcastEpisode.delete({ where: { id: episodeId } });
    return true;
  }

  @Authorized()
  @Mutation(() => PodcastListenPayload)
  async recordPodcastListen(
    @Arg("episodeId", () => String) episodeId: string,
    @Arg("listenedAt", () => Date, { nullable: true }) listenedAt: Date | undefined,
    @Arg("secondsListened", () => Int, { nullable: true }) secondsListened: number | undefined,
    @Arg("completed", () => Boolean, { defaultValue: true }) completed: boolean,
    @Ctx() context: GraphQLContext,
  ): Promise<PodcastListenPayload> {
    requireAuth(context.user);
    if (secondsListened !== undefined && secondsListened < 0) throw new Error("Listened duration cannot be negative");
    const episode = await context.prisma.podcastEpisode.findUnique({ where: { id: episodeId }, select: { id: true, publishedAt: true } });
    if (!episode) throw new Error("Podcast episode not found");
    const timestamp = listenedAt || new Date();
    if (episode.publishedAt && timestamp < episode.publishedAt) throw new Error("Cannot log a listen before the episode was published");
    return context.prisma.userPodcastListen.create({ data: { userId: context.user!.id, episodeId, listenedAt: timestamp, secondsListened, completed } }) as any;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deletePodcastListen(
    @Arg("listenId", () => Int) listenId: number,
    @Ctx() context: GraphQLContext,
  ): Promise<boolean> {
    requireAuth(context.user);
    await context.prisma.userPodcastListen.deleteMany({ where: { id: listenId, userId: context.user!.id } });
    return true;
  }

  @Query(() => [MediaEventPayload])
  async mediaEvents(
    @Arg("eventType", () => String, { nullable: true }) eventType: string | undefined,
    @Arg("city", () => String, { nullable: true }) city: string | undefined,
    @Arg("from", () => Date, { nullable: true }) from: Date | undefined,
    @Arg("to", () => Date, { nullable: true }) to: Date | undefined,
    @Arg("theaterProductionId", () => String, { nullable: true }) theaterProductionId: string | undefined,
    @Arg("limit", () => Int, { defaultValue: 50 }) limit: number,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<MediaEventPayload[]> {
    if (limit < 1 || limit > 100 || offset < 0) throw new Error("Invalid event pagination");
    const type = normalizeEventType(eventType);
    const where: any = { status: { not: "CANCELLED" } };
    if (type) where.eventType = type;
    if (city?.trim()) where.city = { contains: city.trim(), mode: "insensitive" };
    if (theaterProductionId) where.theaterProductionId = theaterProductionId;
    if (from || to) where.startsAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    const events = await prisma.mediaEvent.findMany({
      where,
      include: { ...MEDIA_EVENT_INCLUDE, attendances: { where: { userId: user?.id || "" }, select: { id: true } } } as any,
      orderBy: { startsAt: "asc" }, take: limit, skip: offset,
    });
    return events.map((event: any) => this.mapEvent(event, user?.id));
  }

  @Query(() => MediaEventPayload, { nullable: true })
  async mediaEvent(
    @Arg("id", () => String) id: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<MediaEventPayload | null> {
    const event = await prisma.mediaEvent.findUnique({ where: { id }, include: { ...MEDIA_EVENT_INCLUDE, attendances: { where: user ? { userId: user.id } : { userId: "" }, select: { id: true } } } as any });
    return event ? this.mapEvent(event as any, user?.id) : null;
  }

  @Authorized()
  @Mutation(() => MediaEventPayload)
  async createMediaEvent(
    @Arg("eventType", () => String) eventType: string,
    @Arg("startsAt", () => Date) startsAt: Date,
    @Arg("timeZone", () => String) timeZone: string,
    @Arg("venueName", () => String) venueName: string,
    @Arg("city", () => String) city: string,
    @Arg("title", () => String, { nullable: true }) title: string | undefined,
    @Arg("theaterProductionId", () => String, { nullable: true }) theaterProductionId: string | undefined,
    @Arg("address", () => String, { nullable: true }) address: string | undefined,
    @Arg("credits", () => [GraphQLJSON], { nullable: true }) credits: Array<{ displayName?: string; personId?: string; role?: string }> | undefined,
    @Ctx() context: GraphQLContext,
  ): Promise<MediaEventPayload> {
    requireAdmin(context.user);
    const type = normalizeEventType(eventType);
    validateEventInput({ type, startsAt, timeZone, venueName, city, title, theaterProductionId });
    if (type === "THEATER_PERFORMANCE") {
      const production = await context.prisma.content.findUnique({ where: { id: theaterProductionId }, select: { contentType: { select: { slug: true } } } });
      if (production?.contentType.slug !== "theater") throw new Error("A theater production catalog item is required");
    }
    const normalizedCredits = await normalizeCredits(context.prisma, credits || []);
    const event = await context.prisma.mediaEvent.create({
      data: {
        eventType: type!, theaterProductionId: type === "THEATER_PERFORMANCE" ? theaterProductionId : null,
        title: type === "CONCERT" ? title!.trim() : null, startsAt, timeZone: timeZone.trim(), venueName: venueName.trim(), city: city.trim(), address: address?.trim() || null,
        credits: { create: normalizedCredits },
      }, include: MEDIA_EVENT_INCLUDE as any,
    });
    return this.mapEvent(event as any, context.user?.id);
  }

  @Authorized()
  @Mutation(() => MediaEventPayload)
  async rescheduleMediaEvent(
    @Arg("eventId", () => String) eventId: string,
    @Arg("startsAt", () => Date) startsAt: Date,
    @Arg("venueName", () => String, { nullable: true }) venueName: string | undefined,
    @Arg("city", () => String, { nullable: true }) city: string | undefined,
    @Ctx() context: GraphQLContext,
  ): Promise<MediaEventPayload> {
    requireAdmin(context.user);
    const source = await context.prisma.mediaEvent.findUnique({ where: { id: eventId }, include: { credits: true } });
    if (!source || source.status === "CANCELLED") throw new Error("Event cannot be rescheduled");
    const replacement = await context.prisma.$transaction(async (tx) => {
      await tx.mediaEvent.update({ where: { id: eventId }, data: { status: "POSTPONED" } });
      return tx.mediaEvent.create({
        data: {
          eventType: source.eventType, theaterProductionId: source.theaterProductionId, title: source.title,
          startsAt, timeZone: source.timeZone, venueName: venueName?.trim() || source.venueName,
          city: city?.trim() || source.city, address: source.address, rescheduledFromId: source.id,
          credits: { create: source.credits.map(({ personId, displayName, role, position }) => ({ personId, displayName, role, position })) },
        }, include: MEDIA_EVENT_INCLUDE as any,
      });
    });
    return this.mapEvent(replacement as any, context.user?.id);
  }

  @Authorized()
  @Mutation(() => MediaEventPayload)
  async setMediaEventStatus(
    @Arg("eventId", () => String) eventId: string,
    @Arg("status", () => String) status: string,
    @Ctx() context: GraphQLContext,
  ): Promise<MediaEventPayload> {
    requireAdmin(context.user);
    const normalized = status.trim().toUpperCase();
    if (!["SCHEDULED", "POSTPONED", "COMPLETED", "CANCELLED"].includes(normalized)) throw new Error("Invalid event status");
    const updated = await context.prisma.mediaEvent.update({ where: { id: eventId }, data: { status: normalized as any }, include: MEDIA_EVENT_INCLUDE as any });
    return this.mapEvent(updated as any, context.user?.id);
  }

  @Authorized()
  @Mutation(() => Boolean)
  async recordEventAttendance(
    @Arg("eventId", () => String) eventId: string,
    @Arg("attendedAt", () => Date, { nullable: true }) attendedAt: Date | undefined,
    @Arg("note", () => String, { nullable: true }) note: string | undefined,
    @Ctx() context: GraphQLContext,
  ): Promise<boolean> {
    requireAuth(context.user);
    const event = await context.prisma.mediaEvent.findUnique({ where: { id: eventId }, select: { id: true, startsAt: true, status: true, eventType: true, theaterProductionId: true } });
    if (!event || event.status === "CANCELLED") throw new Error("This event cannot be marked as attended");
    const actualAttendance = attendedAt || event.startsAt;
    if (actualAttendance > new Date()) throw new Error("Attendance can only be recorded for a past event");
    const existing = await context.prisma.userEventAttendance.findUnique({ where: { userId_eventId: { userId: context.user!.id, eventId } } });
    if (existing) return true;
    await context.prisma.$transaction(async (tx) => {
      let contentLogId: number | undefined;
      if (event.eventType === "THEATER_PERFORMANCE" && event.theaterProductionId) {
        const contentLog = await tx.userContentLog.create({ data: { userId: context.user!.id, contentId: event.theaterProductionId, isConsumed: true, date: actualAttendance } });
        contentLogId = contentLog.id;
        await tx.content.update({ where: { id: event.theaterProductionId }, data: { consumeCount: { increment: 1 } } });
      }
      await tx.userEventAttendance.create({ data: { userId: context.user!.id, eventId, attendedAt: actualAttendance, note, contentLogId } });
    });
    return true;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async removeEventAttendance(
    @Arg("eventId", () => String) eventId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<boolean> {
    requireAuth(context.user);
    await context.prisma.$transaction(async (tx) => {
      const attendance = await tx.userEventAttendance.findUnique({ where: { userId_eventId: { userId: context.user!.id, eventId } }, include: { contentLog: true } });
      if (!attendance) return;
      if (attendance.contentLog) {
        await tx.userContentLog.delete({ where: { id: attendance.contentLog.id } });
        await tx.content.update({ where: { id: attendance.contentLog.contentId }, data: { consumeCount: { decrement: 1 } } });
        await tx.content.updateMany({ where: { id: attendance.contentLog.contentId, consumeCount: { lt: 0 } }, data: { consumeCount: 0 } });
      }
      await tx.userEventAttendance.delete({ where: { id: attendance.id } });
    });
    return true;
  }

  private async mapProgram(program: any, userId: string | undefined, prisma: any): Promise<PodcastProgramPayload> {
    const episodeIds = program.episodes.map((episode: any) => episode.id);
    const [allListenCounts, userListenCounts, userListens] = await Promise.all([
      episodeIds.length ? prisma.userPodcastListen.groupBy({ by: ["episodeId"], where: { episodeId: { in: episodeIds } }, _count: { _all: true } }) : [],
      userId && episodeIds.length ? prisma.userPodcastListen.groupBy({ by: ["episodeId"], where: { userId, episodeId: { in: episodeIds } }, _count: { _all: true } }) : [],
      userId && episodeIds.length ? prisma.$queryRaw`
        SELECT id, episode_id AS "episodeId", listened_at AS "listenedAt",
          seconds_listened AS "secondsListened", completed
        FROM (
          SELECT id, episode_id, listened_at, seconds_listened, completed,
            ROW_NUMBER() OVER (PARTITION BY episode_id ORDER BY listened_at DESC, id DESC) AS row_number
          FROM user_podcast_listen
          WHERE user_id = ${userId}::uuid AND episode_id::text = ANY(${episodeIds}::text[])
        ) ranked_listens
        WHERE row_number <= 20
        ORDER BY episode_id, listened_at DESC, id DESC
      ` : [],
    ]);
    const countByEpisode = new Map<string, number>(allListenCounts.map((row: any) => [row.episodeId, row._count._all] as [string, number]));
    const userCountByEpisode = new Map<string, number>(userListenCounts.map((row: any) => [row.episodeId, row._count._all] as [string, number]));
    const listensByEpisode = new Map<string, any[]>();
    for (const listen of userListens) {
      const group = listensByEpisode.get(listen.episodeId) || [];
      if (group.length < 20) group.push(listen);
      listensByEpisode.set(listen.episodeId, group);
    }
    return {
      id: program.id, contentId: program.contentId, title: program.content.title,
      posterUrl: program.content.images?.[0]?.filePath ?? null,
      publicationStatus: program.publicationStatus, languageCode: program.languageCode,
      releaseFrequency: program.releaseFrequency, releaseInterval: program.releaseInterval,
      releaseWeekdays: program.releaseWeekdays,
      credits: program.credits.map((credit: any) => ({ personId: credit.personId, name: credit.person.name, role: credit.role, position: credit.position })),
      episodes: program.episodes.map((episode: any) => this.mapEpisodePayload(episode, countByEpisode.get(episode.id) || 0, userCountByEpisode.get(episode.id) || 0, listensByEpisode.get(episode.id) || [])),
    };
  }

  private async mapEpisode(episode: any, userId: string | undefined, prisma: any): Promise<PodcastEpisodePayload> {
    const [listenCount, myListenCount, mine] = await Promise.all([
      prisma.userPodcastListen.count({ where: { episodeId: episode.id } }),
      userId ? prisma.userPodcastListen.count({ where: { episodeId: episode.id, userId } }) : 0,
      userId ? prisma.userPodcastListen.findMany({ where: { episodeId: episode.id, userId }, orderBy: [{ listenedAt: "desc" }, { id: "desc" }], take: 20 }) : [],
    ]);
    return this.mapEpisodePayload(episode, listenCount, myListenCount, mine);
  }

  private mapEpisodePayload(episode: any, listenCount: number, myListenCount: number, mine: any[]): PodcastEpisodePayload {
    return {
      id: episode.id, programId: episode.programId, seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber, title: episode.title, description: episode.description,
      publishedAt: episode.publishedAt, durationSeconds: episode.durationSeconds,
      audioUrl: episode.audioUrl, isExplicit: episode.isExplicit, listenCount,
      myListenCount,
      credits: (episode.credits || []).map((credit: any) => ({ personId: credit.personId, name: credit.person.name, role: credit.role, position: credit.position })),
      recentListens: mine.sort((a: any, b: any) => b.listenedAt.getTime() - a.listenedAt.getTime()).slice(0, 20).map((listen: any) => ({ id: listen.id, listenedAt: listen.listenedAt, secondsListened: listen.secondsListened, completed: listen.completed })),
    };
  }

  private mapEvent(event: any, userId?: string): MediaEventPayload {
    const attendedByMe = Boolean(event.attendances?.length) || Boolean(event.attendedByMe);
    return {
      id: event.id, eventType: event.eventType, theaterProductionId: event.theaterProductionId,
      title: event.title, startsAt: event.startsAt, timeZone: event.timeZone,
      venueName: event.venueName, city: event.city, address: event.address,
      status: event.status, rescheduledFromId: event.rescheduledFromId,
      theaterProduction: event.theaterProduction ? { id: event.theaterProduction.id, title: event.theaterProduction.title, posterUrl: event.theaterProduction.images?.[0]?.filePath ?? null } : null,
      credits: (event.credits || []).map((credit: any) => ({ personId: credit.personId, displayName: credit.displayName, name: credit.person?.name ?? credit.displayName, role: credit.role, position: credit.position })),
      attendanceCount: event._count?.attendances ?? 0, attendedByMe,
    };
  }
}

async function assertPeopleExist(prisma: any, ids: string[]) {
  if (!ids.length) return;
  const people = await prisma.person.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (people.length !== ids.length) throw new Error("One or more people were not found");
}

function validateWeekdays(weekdays: number[]) {
  if (weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Weekdays must be integers from 0 through 6");
  if (new Set(weekdays).size !== weekdays.length) throw new Error("Weekdays must be unique");
}

function normalizeOptionalUrl(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try { parsed = new URL(trimmed); } catch { throw new Error("Audio URL must be a valid absolute URL"); }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Audio URL must use HTTP or HTTPS");
  return trimmed;
}

function normalizeEventType(value?: string): "THEATER_PERFORMANCE" | "CONCERT" | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === "THEATER_PERFORMANCE" || normalized === "CONCERT") return normalized;
  throw new Error("Invalid media event type");
}

function validateEventInput(input: { type?: string; startsAt: Date; timeZone: string; venueName: string; city: string; title?: string; theaterProductionId?: string }) {
  if (!input.type) throw new Error("Event type is required");
  if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime())) throw new Error("Valid event start time is required");
  if (!input.venueName.trim() || !input.city.trim()) throw new Error("Venue and city are required");
  try { new Intl.DateTimeFormat("en", { timeZone: input.timeZone }).format(); } catch { throw new Error("A valid IANA time zone is required"); }
  if (input.type === "THEATER_PERFORMANCE" && (!input.theaterProductionId || input.title?.trim())) throw new Error("Theater performances require a production and cannot override its title");
  if (input.type === "CONCERT" && (!input.title?.trim() || input.theaterProductionId)) throw new Error("Concerts require a title and cannot link to a theater production");
}

async function normalizeCredits(prisma: any, credits: Array<{ displayName?: string; personId?: string; role?: string }>) {
  const personIds = [...new Set(credits.flatMap((credit) => credit.personId ? [credit.personId] : []))];
  const people = personIds.length ? await prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, name: true } }) : [];
  if (people.length !== personIds.length) throw new Error("One or more people were not found");
  const peopleById = new Map<string, string>(people.map((person: any) => [person.id, person.name] as [string, string]));
  return credits.map((credit, position) => {
    const displayName = credit.displayName?.trim() || (credit.personId ? peopleById.get(credit.personId) : undefined);
    if (!displayName && !credit.personId) throw new Error("Each event credit requires a person or display name");
    return { personId: credit.personId || null, displayName: displayName || "", role: credit.role?.trim() || null, position };
  });
}
