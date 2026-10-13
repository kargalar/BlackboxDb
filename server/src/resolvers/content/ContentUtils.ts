function getBookPublicationAverageRating(publication: any): number | null {
  const votes = publication?.totalRatingVotes ?? 0;
  const score = publication?.totalRatingScore
    ? Number(publication.totalRatingScore)
    : 0;

  return votes > 0 ? score / votes : null;
}

export function convertBookPublicationForGraphQL(publication: any): any {
  if (!publication) return null;

  return {
    ...publication,
    isOriginal: publication.isOriginal ?? false,
    translators: publication.translators ?? [],
    ratingDistribution:
      publication.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    averageRating: getBookPublicationAverageRating(publication),
    ratingCount: publication.totalRatingVotes ?? 0,
    publisher: publication.publisher
      ? {
        id: publication.publisher.id,
        name: publication.publisher.name,
        description: publication.publisher.description,
        headquarters: publication.publisher.headquarters,
        logoUrl: publication.publisher.logoUrl,
        website: publication.publisher.website,
        foundingYear: publication.publisher.foundingYear,
      }
      : null,
  };
}

export function pickPrimaryBookPublication(publications: any[] | undefined) {
  if (!Array.isArray(publications) || publications.length === 0) {
    return null;
  }

  return [...publications].sort((a: any, b: any) => {
    const consumeDiff = (b.consumeCount ?? 0) - (a.consumeCount ?? 0);
    if (consumeDiff !== 0) return consumeDiff;

    const ratingVotesDiff =
      (b.totalRatingVotes ?? 0) - (a.totalRatingVotes ?? 0);
    if (ratingVotesDiff !== 0) return ratingVotesDiff;

    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (createdA !== createdB) return createdA - createdB;

    return (a.id ?? 0) - (b.id ?? 0);
  })[0];
}

export function pickOriginalBookPublication(publications: any[] | undefined) {
  if (!Array.isArray(publications) || publications.length === 0) {
    return null;
  }

  return (
    publications.find((publication: any) => publication.isOriginal) ||
    [...publications].sort((a: any, b: any) => {
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdA !== createdB) return createdA - createdB;
      return (a.id ?? 0) - (b.id ?? 0);
    })[0]
  );
}

export function convertContentForGraphQL(content: any, overridePosterId?: number | null, overrideBackdropId?: number | null): any {
  const sortedPeople = Array.isArray(content.people)
    ? [...content.people].sort(
        (a: any, b: any) => (a.creditOrder ?? 999999) - (b.creditOrder ?? 999999),
      )
    : content.people;

  // Resolve posterUrl and backdropUrl from images array, posterImageId/backdropImageId, or legacy paths
  let posterUrl = content.posterUrl || content.posterPath || null;
  let backdropUrl = content.backdropUrl || content.backdropPath || null;

  if (content.images && Array.isArray(content.images)) {
    if (overridePosterId) {
      const customImage = content.images.find((img: any) => img.id === overridePosterId);
      if (customImage) posterUrl = customImage.filePath;
    }
    
    if (overrideBackdropId) {
      const customImage = content.images.find((img: any) => img.id === overrideBackdropId);
      if (customImage) backdropUrl = customImage.filePath;
    }

    if (!posterUrl) {
      // First try to find by posterImageId, then fall back to type match
      if (content.posterImageId) {
        const posterImage = content.images.find(
          (img: any) => img.id === content.posterImageId,
        );
        if (posterImage) posterUrl = posterImage.filePath;
      }
      if (!posterUrl) {
        const posterImage = content.images.find(
          (img: any) => img.type === "poster",
        );
        if (posterImage) posterUrl = posterImage.filePath;
      }
    }
    if (!backdropUrl) {
      if (content.backdropImageId) {
        const backdropImage = content.images.find(
          (img: any) => img.id === content.backdropImageId,
        );
        if (backdropImage) backdropUrl = backdropImage.filePath;
      }
      if (!backdropUrl) {
        const backdropImage = content.images.find(
          (img: any) => img.type === "backdrop",
        );
        if (backdropImage) backdropUrl = backdropImage.filePath;
      }
    }
  }

  const primaryBookPublication = pickPrimaryBookPublication(
    content.bookPublications,
  );

  if (content.contentTypeId === 4 && primaryBookPublication) {
    posterUrl = primaryBookPublication.coverUrl || posterUrl;
  }

  return {
    ...content,
    people: sortedPeople,
    posterUrl,
    backdropUrl,
    isbn:
      content.contentTypeId === 4
        ? primaryBookPublication?.isbn || content.isbn
        : content.isbn,
    pageCount:
      content.contentTypeId === 4
        ? primaryBookPublication?.pageCount ?? content.pageCount
        : content.pageCount,
    publisher:
      content.contentTypeId === 4
        ? primaryBookPublication?.publisher?.name || content.publisher || null
        : content.publisher,
    publishedDate:
      content.contentTypeId === 4
        ? primaryBookPublication?.publishedDate || content.publishedDate || null
        : content.publishedDate,
    language:
      content.contentTypeId === 4
        ? primaryBookPublication?.language || content.language || null
        : content.language,
    primaryBookPublication: convertBookPublicationForGraphQL(
      primaryBookPublication,
    ),
    bookPublications:
      content.bookPublications
        ?.map(convertBookPublicationForGraphQL)
        .filter(Boolean) || [],
    budget: content.budget ? content.budget.toString() : null,
    revenue: content.revenue ? content.revenue.toString() : null,
    franchiseId: content.franchiseId || null,
    franchiseName: content.franchise?.name || null,
    franchise: undefined,
    genres:
      content.genres?.map((cg: any) => ({
        id: cg.genre.id,
        name: cg.genre.name,
      })) || [],
    themes:
      content.contentThemes
        ?.map((ct: any) => ({
          id: ct.theme?.id,
          name: ct.theme?.name,
        }))
        .filter((t: any) => t.id && t.name) || [],
    moods:
      content.contentMoods
        ?.map((cm: any) => ({
          id: cm.mood?.id,
          name: cm.mood?.name,
        }))
        .filter((m: any) => m.id && m.name) || [],
    gameModes:
      content.contentGameModes
        ?.map((cgm: any) => ({
          id: cgm.gameMode?.id,
          name: cgm.gameMode?.name,
        }))
        .filter((gm: any) => gm.id && gm.name) || [],
    gameEngines:
      content.contentGameEngines
        ?.map((cge: any) => ({
          id: cge.gameEngine?.id,
          name: cge.gameEngine?.name,
        }))
        .filter((ge: any) => ge.id && ge.name) || [],
    perspectives:
      content.contentPerspectives
        ?.map((cp: any) => ({
          id: cp.perspective?.id,
          name: cp.perspective?.name,
        }))
        .filter((p: any) => p.id && p.name) || [],
    platforms:
      content.contentPlatforms
        ?.map((cp: any) => ({
          id: cp.platform?.id,
          name: cp.platform?.name,
        }))
        .filter((p: any) => p.id && p.name) || [],
    ageRating: content.ageRating
      ? {
        id: content.ageRating.id,
        name: content.ageRating.name,
      }
      : null,
    companies:
      content.companies?.map((cc: any) => ({
        id: cc.id,
        contentId: cc.contentId,
        companyId: cc.companyId,
        companyRoleId: cc.companyRoleId,
        company: cc.company
          ? {
            id: cc.company.id,
            name: cc.company.name,
            description: cc.company.description,
            headquarters: cc.company.headquarters,
            logoUrl: cc.company.logoUrl,
            website: cc.company.website,
            foundingYear: cc.company.foundingYear,
          }
          : null,
      })) || [],
    contentThemes: undefined,
    contentMoods: undefined,
    contentGameModes: undefined,
    contentGameEngines: undefined,
    contentPerspectives: undefined,
    contentPlatforms: undefined,
  };
}
