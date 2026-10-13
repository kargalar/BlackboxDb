import { AddContentFormData, BookPublicationItem, PersonItem } from '../types';
import { assignCreditOrder } from '@/lib/array-utils';
import { normalizeThemeName } from '@/lib/themeNormalizer';
import { isFutureDate } from '@/lib/contentStatus';

interface BuildInputParams {
  formData: AddContentFormData;
  posterUrl: string;
  backdropUrl: string;
  isEditMode: boolean;
}

function normalizeOriginalPublicationSelection(
  publications: BookPublicationItem[]
): BookPublicationItem[] {
  let originalSeen = false;
  const normalized = publications.map((publication) => {
    const isOriginal = publication.isOriginal && !originalSeen;
    if (isOriginal) originalSeen = true;
    return { ...publication, isOriginal };
  });

  if (!originalSeen && normalized.length > 0) {
    normalized[0] = { ...normalized[0], isOriginal: true };
  }

  return normalized;
}

function getOriginalBookPublication(
  publications: BookPublicationItem[]
): BookPublicationItem | undefined {
  return publications.find((publication) => publication.isOriginal) || publications[0];
}

function getBookPublications(formData: AddContentFormData): BookPublicationItem[] {
  if (formData.bookPublications?.length) {
    return normalizeOriginalPublicationSelection(formData.bookPublications);
  }

  if (
    formData.isbn?.trim() ||
    formData.pageCount?.trim() ||
    formData.translators?.trim() ||
    formData.publisher ||
    formData.releaseDate
  ) {
    return normalizeOriginalPublicationSelection([
      {
        title: formData.title,
        isbn: formData.isbn,
        publisher: formData.publisher || null,
        translators: formData.translators,
        language: '',
        pageCount: formData.pageCount,
        publishedDate: formData.releaseDate,
        isOriginal: true,
      },
    ]);
  }

  return [];
}

function hasPublicationData(publication: any): boolean {
  const hasTranslators = Array.isArray(publication.translators)
    ? publication.translators.length > 0
    : !!publication.translators;

  return !!(
    publication.title ||
    publication.isbn ||
    publication.publisher ||
    hasTranslators ||
    publication.language ||
    publication.pageCount ||
    publication.coverUrl ||
    publication.publishedDate ||
    publication.editionType ||
    publication.isOriginal ||
    publication.isAbridged
  );
}

function normalizeTranslatorPeople(translators: BookPublicationItem['translators']): PersonItem[] {
  if (!translators) return [];
  if (Array.isArray(translators)) {
    return translators
      .map((translator) => ({
        ...translator,
        role: 'translator',
      }))
      .filter((translator) => translator.name?.trim());
  }

  return translators
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, role: 'translator' }));
}

function stringifyTranslators(translators: BookPublicationItem['translators']): string | undefined {
  const people = normalizeTranslatorPeople(translators);
  return people.length > 0 ? JSON.stringify(people) : undefined;
}

/**
 * Pure function that builds the API input object from form data.
 * Handles content-type-specific fields, companies, themes, screenshots, etc.
 */
export function buildContentInput({
  formData,
  posterUrl,
  backdropUrl,
  isEditMode,
}: BuildInputParams) {
  const contentType = parseInt(formData.contentTypeId);
  const bookPublications = contentType === 4 ? getBookPublications(formData) : [];
  const originalBookPublication =
    contentType === 4 ? getOriginalBookPublication(bookPublications) : undefined;
  const effectiveReleaseDate = formData.releaseDate;

  // Resim URL'lerini hazırla
  // - boş string ise null gönder (silme işlemi için, sadece edit modda)
  // - undefined ise hiç gönderme (değişiklik yok)
  const getPosterUrlValue = () => {
    if (posterUrl?.startsWith('data:')) return undefined; // Base64 upload edilemedi
    if (posterUrl === '') return isEditMode ? null : undefined; // Resim kaldırıldı
    if (posterUrl) return posterUrl.trim();
    return undefined;
  };

  const getBackdropUrlValue = () => {
    if (backdropUrl?.startsWith('data:')) return undefined;
    if (backdropUrl === '') return isEditMode ? null : undefined;
    if (backdropUrl) return backdropUrl.trim();
    return undefined;
  };

  // --- Status & Continuing Inference ---
  let inferredStatus = 'finished';
  let inferredIsContinuing = false;

  if (contentType === 1 || contentType === 3 || contentType === 4 || contentType === 5) {
    // Movies (1), Games (3), Books (4), Music (5)
    if (isFutureDate(effectiveReleaseDate)) {
      inferredStatus = 'upcoming';
    }
  } else if (contentType === 2) {
    // Series (2)
    if (isFutureDate(formData.firstAirDate)) {
      inferredStatus = 'upcoming';
      inferredIsContinuing = !formData.lastAirDate;
    } else if (!formData.lastAirDate) {
      inferredStatus = 'ongoing';
      inferredIsContinuing = true;
    } else {
      inferredStatus = 'finished';
      inferredIsContinuing = false;
    }
  }

  // Temel input
  const input: any = {
    title: formData.title.trim(),
    originalTitle: contentType === 4 ? undefined : formData.originalTitle?.trim() || undefined,
    alternativeTitles: formData.alternativeTitles?.map((item) => item.trim()).filter(Boolean).length
      ? Array.from(new Set(formData.alternativeTitles.map((item) => item.trim()).filter(Boolean)))
      : isEditMode
        ? []
        : undefined,
    contentTypeId: contentType,
    tmdbId: undefined,
    igdbId: undefined,
    description: formData.description.trim() || undefined,
    releaseDate: formData.releaseDate || undefined,
    runtime: formData.runtime ? Number(formData.runtime) : undefined,
    posterUrl: contentType === 4 ? (isEditMode ? null : undefined) : getPosterUrlValue(),
    backdropUrl: contentType === 4 ? (isEditMode ? null : undefined) : getBackdropUrlValue(),
    autoSelectHighestVotedMedia: formData.autoSelectHighestVotedMedia,
    additionalRatingCategories: formData.additionalRatingCategories,
    status: inferredStatus,
    isContinuing: inferredIsContinuing,
    // Franchise - id'yi string olarak gönder (UUID) veya name gönder backend halletsin
    franchiseId: formData.franchise?.id ? String(formData.franchise.id) : undefined,
    franchiseName: formData.franchise?.name || undefined,
    // Languages - object array olarak gönder (id ve name ile)
    languages:
      contentType !== 4 && formData.languages && formData.languages.length > 0
        ? formData.languages.map((l: any) => ({ id: l.id, name: l.name }))
        : undefined,
    // Genres'den sadece id ve name'i gönder
    genres:
      formData.genres && formData.genres.length > 0
        ? formData.genres.map((g: any) => ({
            id: typeof g.id === 'string' ? g.id : undefined,
            name: g.name,
          }))
        : undefined,
    awards: formData.awards?.map((item) => item.trim()).filter(Boolean).length
      ? Array.from(new Set(formData.awards.map((item) => item.trim()).filter(Boolean)))
      : isEditMode
        ? []
        : undefined,
  };

  // --- Film-spesifik alanlar (contentTypeId = 1) ---
  if (contentType === 1) {
    const resolvedTmdbId =
      formData.tmdbId ||
      (formData.autoFillSource?.startsWith('tmdb') && formData.autoFillSourceId
        ? Number(formData.autoFillSourceId)
        : undefined);
    input.tmdbId = Number.isFinite(resolvedTmdbId) ? resolvedTmdbId : undefined;
    input.budget = formData.budget ? formData.budget : undefined;
    input.revenue = formData.revenue ? formData.revenue : undefined;
    // Assign creditOrder based on array index before sending
    const castWithOrder = assignCreditOrder(formData.cast as any);
    // In edit mode, always send cast/crew (even empty) so server deletes old records
    input.cast =
      castWithOrder.length > 0 ? JSON.stringify(castWithOrder) : isEditMode ? '[]' : undefined;
    input.crew =
      formData.crew.length > 0 ? JSON.stringify(formData.crew) : isEditMode ? '[]' : undefined;
    console.log('🎬 [AddContent] Movie data:', {
      budget: input.budget,
      revenue: input.revenue,
      cast: input.cast,
      crew: input.crew,
    });
  }

  if (contentType === 2) {
    const resolvedTmdbId =
      formData.tmdbId ||
      (formData.autoFillSource?.startsWith('tmdb') && formData.autoFillSourceId
        ? Number(formData.autoFillSourceId)
        : undefined);
    input.tmdbId = Number.isFinite(resolvedTmdbId) ? resolvedTmdbId : undefined;
    input.inProduction = !formData.lastAirDate;
    input.firstAirDate = formData.firstAirDate || undefined;
    input.lastAirDate = formData.lastAirDate || undefined;
    // In edit mode, always send seasons (even empty '[]') so server deletes old season/episode records
    input.seasons =
      formData.seasons.length > 0
        ? JSON.stringify(formData.seasons)
        : isEditMode
          ? '[]'
          : undefined;
    const castWithOrder = assignCreditOrder(formData.cast as any);
    // In edit mode, always send cast/crew (even empty) so server deletes old records
    input.cast =
      castWithOrder.length > 0 ? JSON.stringify(castWithOrder) : isEditMode ? '[]' : undefined;
    input.crew =
      formData.crew.length > 0 ? JSON.stringify(formData.crew) : isEditMode ? '[]' : undefined;
    console.log('📺 [AddContent] TV data:', {
      seasons: input.seasons,
      seasonCount: formData.seasons.length,
      cast: input.cast,
      crew: input.crew,
    });
  }

  if (formData.contentTypeSlug === 'theater') {
    const castWithOrder = assignCreditOrder(formData.cast as any);
    input.cast =
      castWithOrder.length > 0 ? JSON.stringify(castWithOrder) : isEditMode ? '[]' : undefined;
    input.crew =
      formData.crew.length > 0 ? JSON.stringify(formData.crew) : isEditMode ? '[]' : undefined;
  }

  if (contentType === 4) {
    const firstPublication = originalBookPublication || bookPublications[0];

    input.isbn = firstPublication?.isbn?.trim() || undefined;
    input.pageCount = firstPublication?.pageCount ? Number(firstPublication.pageCount) : undefined;
    input.translators = stringifyTranslators(firstPublication?.translators);
    input.publishedDate = firstPublication?.publishedDate || undefined;
    input.releaseDate = formData.releaseDate || undefined;
    input.previewLink = formData.previewLink?.trim() || undefined;
    input.infoLink = formData.infoLink?.trim() || undefined;
    input.languages = firstPublication?.language?.trim()
      ? [{ name: firstPublication.language.trim() }]
      : undefined;
    input.bookPublications = bookPublications
      .map((publication) => {
        const publisher = publication.publisher;
        return {
          id: publication.id ? Number(publication.id) : undefined,
          title: publication.title?.trim() || undefined,
          subtitle: publication.subtitle?.trim() || undefined,
          isbn: publication.isbn?.trim() || undefined,
          publisher:
            publisher && publisher.name
              ? {
                  id:
                    publisher.id !== undefined && publisher.id !== null
                      ? String(publisher.id)
                      : undefined,
                  name: publisher.name,
                  description: publisher.description || undefined,
                  headquarters: publisher.headquarters || undefined,
                  logoUrl: publisher.logoUrl || undefined,
                  website: publisher.website || undefined,
                  foundingYear: publisher.foundingYear ? Number(publisher.foundingYear) : undefined,
                  companyRoleId: 3,
                }
              : undefined,
          translators: stringifyTranslators(publication.translators),
          language: publication.language?.trim() || undefined,
          pageCount: publication.pageCount ? Number(publication.pageCount) : undefined,
          coverUrl: publication.coverUrl?.trim() || undefined,
          publishedDate: publication.publishedDate || undefined,
          editionType: publication.editionType?.trim() || undefined,
          format: publication.format?.trim() || undefined,
          isOriginal: !!publication.isOriginal,
          isAbridged: !!publication.isAbridged,
        };
      })
      .filter(hasPublicationData);

    // Authors are now sent as crew with role='author'
    const crewPeople: any[] = [];
    if (formData.authors && formData.authors.length > 0) {
      crewPeople.push(
        ...formData.authors.map((a: any) => ({
          id: a.id,
          name: a.name,
          role: 'author',
          profileUrl: a.profileUrl || undefined,
          biography: a.biography || undefined,
          birthDate: a.birthDate || undefined,
          deathDate: a.deathDate || undefined,
          placeOfBirth: a.placeOfBirth || undefined,
        }))
      );
    }

    const seenTranslators = new Set<string>();
    for (const publication of bookPublications) {
      for (const translator of normalizeTranslatorPeople(publication.translators)) {
        const key = translator.id ? `id:${translator.id}` : `name:${translator.name.toLowerCase()}`;
        if (seenTranslators.has(key)) continue;
        seenTranslators.add(key);
        crewPeople.push({
          id: translator.id,
          name: translator.name,
          role: 'translator',
          profileUrl: translator.profileUrl || undefined,
          biography: translator.biography || undefined,
          birthDate: translator.birthDate || undefined,
          deathDate: translator.deathDate || undefined,
          placeOfBirth: translator.placeOfBirth || undefined,
        });
      }
    }

    if (crewPeople.length > 0) {
      input.crew = JSON.stringify(crewPeople);
    }
    console.log('📚 [AddContent] Book data:', {
      crew: input.crew,
      publications: input.bookPublications?.length || 0,
    });
  }

  // --- Müzik-spesifik alanlar (contentTypeId = 5) ---
  if (contentType === 5) {
    input.musicReleaseType = formData.musicReleaseType || (isEditMode ? null : undefined);
    input.explicit = formData.explicit ?? false;
    input.label = formData.label?.trim() || (isEditMode ? null : undefined);
    input.totalTracks =
      formData.totalTracks !== undefined && Number.isFinite(Number(formData.totalTracks))
        ? Number(formData.totalTracks)
        : isEditMode
          ? null
          : undefined;
    input.spotifyUrl = formData.spotifyUrl?.trim() || (isEditMode ? null : undefined);
  }

  // --- Oyun-spesifik alanlar (contentTypeId = 3) ---
  if (contentType === 3) {
    const resolvedIgdbId =
      formData.igdbId ||
      (formData.autoFillSource === 'igdb' && formData.autoFillSourceId
        ? Number(formData.autoFillSourceId)
        : undefined);
    input.igdbId = Number.isFinite(resolvedIgdbId) ? resolvedIgdbId : undefined;

    if (formData.gameModes && formData.gameModes.length > 0) {
      input.gameModes = formData.gameModes.map((m: any) => ({
        id: m.id ? Number(m.id) : undefined,
        name: m.name,
      }));
    }
    if (formData.gameEngines && formData.gameEngines.length > 0) {
      input.gameEngines = formData.gameEngines.map((engine: any) => ({
        id: engine.id ? Number(engine.id) : undefined,
        name: engine.name,
      }));
    }
    if (formData.perspectives && formData.perspectives.length > 0) {
      input.perspectives = formData.perspectives.map((p: any) => ({
        id: p.id ? Number(p.id) : undefined,
        name: p.name,
      }));
    }
    if (formData.platforms && formData.platforms.length > 0) {
      input.platforms = formData.platforms.map((p: any) => ({
        id: p.id ? Number(p.id) : undefined,
        name: p.name,
      }));
    }
    // Expansions (DLC and Remakes) - boş array da gönderilmeli (silme için)
    if (isEditMode || (formData.expansions && formData.expansions.length > 0)) {
      input.expansions = (formData.expansions || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        description: e.description || undefined,
        posterUrl: e.posterUrl || undefined,
        releaseDate: e.releaseDate || undefined,
        type: e.type || 'expansion',
      }));
      console.log('🎮 [AddContent] Expansions:', input.expansions.length, 'items');
    }
  }

  // --- Companies ---
  // Company Role IDs: 3=bookpublisher, 4=gamepublisher, 5=gamedeveloper, 6=moviestudio
  const combinedCompanies: any[] = [];

  if (contentType === 1 || contentType === 2) {
    // Films / TV Shows: moviestudio=6
    if (formData.studios) {
      combinedCompanies.push(...formData.studios.map((c: any) => ({ ...c, companyRoleId: 6 })));
    }
  } else if (contentType === 3) {
    // Games: developer=5, publisher=4
    if (formData.developerCompanies)
      combinedCompanies.push(
        ...formData.developerCompanies.map((c: any) => ({ ...c, companyRoleId: 5 }))
      );
    if (formData.publisherCompanies)
      combinedCompanies.push(
        ...formData.publisherCompanies.map((c: any) => ({ ...c, companyRoleId: 4 }))
      );
  } else if (contentType === 4) {
    // Books: publisher=3
    const seenPublisherIds = new Set<string>();
    for (const publication of bookPublications) {
      const publisher = publication.publisher;
      if (!publisher?.name) continue;
      const key = publisher.id ? `id:${publisher.id}` : `name:${publisher.name.toLowerCase()}`;
      if (seenPublisherIds.has(key)) continue;
      seenPublisherIds.add(key);
      combinedCompanies.push({ ...publisher, companyRoleId: 3 });
    }
  }

  if (combinedCompanies.length > 0) {
    input.companies = combinedCompanies.map((c: any) => ({
      id: c.id !== undefined && c.id !== null ? String(c.id) : undefined,
      name: c.name,
      description: c.description || undefined,
      headquarters: c.headquarters || undefined,
      logoUrl: c.logoUrl || undefined,
      website: c.website || undefined,
      foundingYear: c.foundingYear ? Number(c.foundingYear) : undefined,
      companyRoleId: c.companyRoleId,
    }));
    console.log('🏢 [AddContent] Companies:', input.companies.length);
  }

  // --- Themes & Moods ---
  if (formData.themes && formData.themes.length > 0) {
    input.themes = formData.themes.map((t: any) => ({
      id: t.id ? Number(t.id) : undefined,
      name: normalizeThemeName(t.name),
    }));
  }
  if (formData.moods && formData.moods.length > 0) {
    input.moods = formData.moods.map((m: any) => ({
      id: m.id ? Number(m.id) : undefined,
      name: m.name,
    }));
  }
  if (formData.ageRating?.id) {
    input.ageRatingId = Number(formData.ageRating.id);
  } else if (formData.ageRating?.name?.trim()) {
    input.ageRatingName = formData.ageRating.name.trim();
  }

  // --- Screenshots ---
  const validTvSeasonNumbers = new Set(
    contentType === 2 ? formData.seasons.map((season) => Number(season.seasonNumber)) : []
  );
  const allScreenshots =
    contentType === 4
      ? []
      : formData.screenshots
          .filter((s: any) => {
            if (contentType !== 2 || validTvSeasonNumbers.size === 0) return true;
            return s.seasonNumber === undefined || s.seasonNumber === null
              ? true
              : validTvSeasonNumbers.has(Number(s.seasonNumber));
          })
          .filter((s: any) => s.imageUrl && !s.imageUrl.startsWith('data:'))
          .map((s: any, index: number) => ({
            imageUrl: s.imageUrl,
            difficulty: s.difficulty || 1,
            order: typeof s.order === 'number' ? s.order : index,
            description: s.description || null,
            isEnabledForQuiz: s.isEnabledForQuiz || false,
            isSpoiler: s.isSpoiler || false,
            isSensitive: s.isSensitive || false,
            seasonNumber:
              contentType === 2 && s.seasonNumber !== undefined && s.seasonNumber !== null
                ? Number(s.seasonNumber)
                : null,
          }));

  // Edit modunda screenshot'ları her zaman gönder (boş array = hepsini sil)
  if (contentType !== 4 && isEditMode) {
    input.screenshots = allScreenshots;
    console.log(
      '📸 [AddContent] Screenshots to save:',
      allScreenshots.length,
      'quiz enabled:',
      allScreenshots.filter((s: any) => s.isEnabledForQuiz).length
    );
  } else if (contentType !== 4 && allScreenshots.length > 0) {
    input.screenshots = allScreenshots;
    console.log(
      '📸 [AddContent] Screenshots to save:',
      allScreenshots.length,
      'quiz enabled:',
      allScreenshots.filter((s: any) => s.isEnabledForQuiz).length
    );
  }

  // --- Trailer & Videos ---
  if (contentType !== 4) {
    if (formData.trailerUrl?.trim()) {
      input.trailerUrl = formData.trailerUrl.trim();
      console.log('🎬 [AddContent] Trailer URL:', input.trailerUrl);
    }
    if (formData.reviewVideoUrl?.trim()) {
      input.reviewVideoUrl = formData.reviewVideoUrl.trim();
      console.log('🎬 [AddContent] Review Video URL:', input.reviewVideoUrl);
    }
    if (formData.gameplayVideoUrl?.trim()) {
      input.gameplayVideoUrl = formData.gameplayVideoUrl.trim();
      console.log('🎬 [AddContent] Gameplay Video URL:', input.gameplayVideoUrl);
    }
  }

  // --- Soundtrack ---
  if (contentType !== 4 && formData.spotifyPlaylistUrl?.trim()) {
    input.spotifyPlaylistUrl = formData.spotifyPlaylistUrl.trim();
    console.log('🎵 [AddContent] Spotify Playlist URL:', input.spotifyPlaylistUrl);
  }

  // --- Similar Contents ---
  if (formData.similarContents && formData.similarContents.length > 0) {
    input.similarContentIds = formData.similarContents.map((c: any) => c.id);
  } else if (isEditMode) {
    // If edit mode and array is empty, clear similar contents
    input.similarContentIds = [];
  }

  // --- Citations Received ---
  if (formData.citationsReceived && formData.citationsReceived.length > 0) {
    input.citationsReceived = formData.citationsReceived.map((c: any) => ({
      citingContentId: c.id,
      note: c.note || null,
      imageUrl: c.imageUrl || null,
    }));
  } else if (isEditMode) {
    input.citationsReceived = [];
  }

  // --- Citations Made ---
  if (formData.citationsMade && formData.citationsMade.length > 0) {
    input.citationsMade = formData.citationsMade.map((c: any) => ({
      citingContentId: c.id,
      note: c.note || null,
      imageUrl: c.imageUrl || null,
    }));
  } else if (isEditMode) {
    input.citationsMade = [];
  }

  // --- Alternative Images ---
  if (formData.images && formData.images.length > 0) {
    input.images = formData.images
      .filter((img) => !img.filePath.startsWith('data:')) // uploaded or existing
      .map((img) => ({
        id: img.id,
        filePath: img.filePath,
        type: img.type,
      }));
  } else if (isEditMode) {
    input.images = [];
  }

  return { input, allScreenshots };
}
