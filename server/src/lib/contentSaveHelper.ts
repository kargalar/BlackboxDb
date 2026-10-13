import type { PrismaClient } from "@prisma/client";
import { notifyUsersOfNewSeason } from "./newSeasonNotificationHelper";
import { generatePersonSlug, generateCompanySlug } from "./slugUtils";

/**
 * Content Save Helper
 * API'den gelen content verilerini normalize edilmiş veritabanı yapısına kaydeder
 *
 * ⚠️ DEPRECATED: Phase 2'de API entegrasyonu kaldırılmıştır.
 * Bu dosya legacy kodudur ve artık kullanılmamaktadır.
 * İçerik ekleme için /app/add-content veya GraphQL createContent mutation kullanın.
 *
 * @deprecated
 */

// TMDB API Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface TmdbMovie {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  poster_path?: string;
  backdrop_path?: string;
  homepage?: string;
  imdb_id?: string;
  status?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  adult?: boolean;
  original_language?: string;
  genres?: Array<{ id: number; name: string }>;

  production_companies?: Array<{
    id: number;
    name: string;
    logo_path?: string;
    origin_country?: string;
  }>;
  spoken_languages?: Array<{
    iso_639_1: string;
    english_name: string;
    name: string;
  }>;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character?: string;
      profile_path?: string;
      order?: number;
      gender?: number;
      popularity?: number;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job?: string;
      department?: string;
      profile_path?: string;
      gender?: number;
      popularity?: number;
    }>;
  };
  images?: {
    posters?: Array<{
      file_path: string;
      width?: number;
      height?: number;
      aspect_ratio?: number;
      iso_639_1?: string;
      vote_average?: number;
      vote_count?: number;
    }>;
    backdrops?: Array<{
      file_path: string;
      width?: number;
      height?: number;
      aspect_ratio?: number;
      iso_639_1?: string;
      vote_average?: number;
      vote_count?: number;
    }>;
  };
  videos?: {
    results?: Array<{
      key: string;
      name: string;
      site: string;
      type: string;
      size?: number;
      official?: boolean;
      published_at?: string;
    }>;
  };
  belongs_to_collection?: any;
  release_dates?: any;
  recommendations?: any;
  similar?: any;
}

interface TmdbPersonDetails {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  gender?: number;
  profile_path?: string;
  popularity?: number;
}

export class ContentSaveHelper {
  constructor(private prisma: PrismaClient) {}

  /**
   * TMDB filmini normalize yapıya kaydet
   */
  async saveTmdbMovie(data: TmdbMovie, contentId: string) {
    console.log("🎬 TMDB film kaydediliyor:", data.title);

    try {
      // 1. Genres kaydet ve bağla
      if (data.genres && data.genres.length > 0) {
        await this.saveTmdbGenres(data.genres, contentId);
      }

      // 3. Languages kaydet ve bağla
      if (data.spoken_languages && data.spoken_languages.length > 0) {
        await this.saveLanguages(data.spoken_languages, contentId);
      }

      // 4. Original language kaydet
      if (data.original_language) {
        await this.saveOriginalLanguage(data.original_language, contentId);
      }

      // 5. Production companies kaydet
      if (data.production_companies && data.production_companies.length > 0) {
        await this.saveTmdbCompanies(data.production_companies, contentId);
      }

      // 6. Cast & Crew kaydet
      if (data.credits) {
        if (data.credits.cast && data.credits.cast.length > 0) {
          await this.saveTmdbCast(data.credits.cast, contentId);
        }
        if (data.credits.crew && data.credits.crew.length > 0) {
          await this.saveTmdbCrew(data.credits.crew, contentId);
        }
      }

      // 7. Images kaydet
      if (data.images) {
        if (data.images.posters && data.images.posters.length > 0) {
          await this.saveImages(data.images.posters, contentId, "poster");
        }
        if (data.images.backdrops && data.images.backdrops.length > 0) {
          await this.saveImages(data.images.backdrops, contentId, "backdrop");
        }
      }

      console.log("✅ TMDB film başarıyla kaydedildi:", data.title);
      return true;
    } catch (error) {
      console.error("❌ Film kaydedilirken hata:", error);
      throw error;
    }
  }

  /**
   * TMDB genres kaydet
   */
  private async saveTmdbGenres(
    genres: Array<{ id: number; name: string }>,
    contentId: string,
  ) {
    for (const genreData of genres) {
      try {
        // Master genre oluştur veya bul (name üzerinden)
        let genre = await this.prisma.genre.findFirst({
          where: { name: genreData.name },
        });

        if (!genre) {
          genre = await this.prisma.genre.create({
            data: { name: genreData.name },
          });
        }

        // Content ↔ Genre ilişkisi oluştur
        await this.prisma.contentGenre.upsert({
          where: {
            contentId_genreId: {
              contentId,
              genreId: genre.id,
            },
          },
          update: {},
          create: {
            contentId,
            genreId: genre.id,
          },
        });

        console.log(`  ✅ Genre kaydedildi: ${genre.name} `);
      } catch (error) {
        console.error(`  ❌ Genre kaydedilemedi: ${genreData.name} `, error);
      }
    }
  }

  /**
   * Languages kaydet
   */
  private async saveLanguages(
    languages: Array<{ iso_639_1: string; english_name: string; name: string }>,
    contentId: string,
  ) {
    try {
      // Extract ISO codes and update content languages array
      const languageCodes = languages
        .map((lang) => lang.iso_639_1)
        .filter(Boolean);

      if (languageCodes.length > 0) {
        await this.prisma.content.update({
          where: { id: contentId },
          data: {
            languages: languageCodes,
          },
        });
        console.log(`  ✅ Languages saved: ${languageCodes.join(", ")} `);
      }

      // Still create Language records in lookup table for reference (name üzerinden)
      for (const langData of languages) {
        try {
          const langName = langData.english_name || langData.name;
          const existingLang = await this.prisma.language.findFirst({
            where: { name: langName },
          });

          if (!existingLang) {
            await this.prisma.language.create({
              data: { name: langName },
            });
          }
        } catch (error) {
          console.error(
            `  ❌ Language lookup record failed: ${langData.english_name} `,
            error,
          );
        }
      }
    } catch (error) {
      console.error(`  ❌ Languages could not be saved`, error);
    }
  }

  /**
   * Original language kaydet
   */
  private async saveOriginalLanguage(isoCode: string, contentId: string) {
    try {
      // Add original language to content languages array
      await this.prisma.content.update({
        where: { id: contentId },
        data: {
          languages: {
            push: isoCode,
          },
        },
      });

      // Create Language lookup record if not exists (name üzerinden)
      const existingLang = await this.prisma.language.findFirst({
        where: { name: isoCode.toUpperCase() },
      });

      if (!existingLang) {
        await this.prisma.language.create({
          data: { name: isoCode.toUpperCase() },
        });
      }

      console.log(`  ✅ Original language saved: ${isoCode} `);
    } catch (error) {
      console.error(
        `  ❌ Original language could not be saved: ${isoCode} `,
        error,
      );
    }
  }

  /**
   * TMDB production companies kaydet (moviestudio role)
   */
  private async saveTmdbCompanies(
    companies: Array<{
      id: number;
      name: string;
      logo_path?: string;
      origin_country?: string;
    }>,
    contentId: string,
  ) {
    for (const companyData of companies) {
      try {
        let company = await this.prisma.company.findFirst({
          where: { name: { equals: companyData.name, mode: "insensitive" } },
        });

        if (!company) {
          const companySlug = await generateCompanySlug(
            this.prisma,
            companyData.name,
          );
          company = await this.prisma.company.create({
            data: {
              id: companySlug,
              name: companyData.name,
              logoUrl: companyData.logo_path
                ? `https://image.tmdb.org/t/p/w185${companyData.logo_path}`
                : undefined,
              defaultRoleIds: [6],
            },
          });
        } else if (!company.defaultRoleIds.includes(6)) {
          company = await this.prisma.company.update({
            where: { id: company.id },
            data: { defaultRoleIds: [...company.defaultRoleIds, 6] },
          });
        }

        if (!company) return;

        // Content ↔ Company ilişkisi
        await this.prisma.contentCompany.upsert({
          where: {
            contentId_companyId_companyRoleId: {
              contentId,
              companyId: company.id,
              companyRoleId: 6,
            },
          },
          update: {},
          create: {
            contentId,
            companyId: company.id,
            companyRoleId: 6,
          },
        });

        console.log(`  ✅ Company kaydedildi: ${company.name} `);
      } catch (error) {
        console.error(
          `  ❌ Company kaydedilemedi: ${companyData.name} `,
          error,
        );
      }
    }
  }

  /**
   * TMDB cast kaydet
   */
  private async saveTmdbCast(
    cast: Array<{
      id: number;
      name: string;
      character?: string;
      profile_path?: string;
      order?: number;
      gender?: number;
      popularity?: number;
    }>,
    contentId: string,
  ) {
    for (const castData of cast) {
      try {
        console.log(`  📝 Cast kaydediliyor: ${castData.name}`);

        const personSlug = await generatePersonSlug(this.prisma, castData.name);
        const person = await this.prisma.person
          .create({
            data: {
              id: personSlug,
              name: castData.name,
              profileUrl: castData.profile_path,
              gender: castData.gender ? castData.gender.toString() : undefined,
              // Detaylı bilgiler - API kaldırıldığı için null
              biography: null,
              birthDate: null,
              deathDate: null,
              placeOfBirth: null,
            },
          })
          .catch(() =>
            this.prisma.person.findFirst({
              where: { name: castData.name },
            }),
          );

        if (!person) return;

        // Content ↔ Person ilişkisi (actor)
        await this.prisma.contentPerson.upsert({
          where: {
            contentId_personId_personRoleId_character: {
              contentId,
              personId: person.id,
              personRoleId: null,
              character: castData.character || "",
            },
          },
          update: {
            creditOrder: castData.order,
            role: "actor",
          },
          create: {
            contentId,
            personId: person.id,
            role: "actor",
            character: castData.character,
            creditOrder: castData.order,
          },
        });

        console.log(
          `  ✅ Cast kaydedildi: ${person.name} as ${castData.character} `,
        );
      } catch (error) {
        console.error(`  ❌ Cast kaydedilemedi: ${castData.name} `, error);
      }
    }
  }

  /**
   * TMDB crew kaydet
   */
  private async saveTmdbCrew(
    crew: Array<{
      id: number;
      name: string;
      job?: string;
      department?: string;
      profile_path?: string;
      gender?: number;
      popularity?: number;
    }>,
    contentId: string,
  ) {
    // Sadece yönetmenleri kaydet (diğerleri opsiyonel)
    const directors = crew.filter((c) => c.job === "Director");

    for (const crewData of directors) {
      try {
        console.log(`  📝 Crew kaydediliyor: ${crewData.name}`);

        const personSlug = await generatePersonSlug(this.prisma, crewData.name);
        const person = await this.prisma.person
          .create({
            data: {
              id: personSlug,
              name: crewData.name,
              profileUrl: crewData.profile_path,
              gender: crewData.gender ? crewData.gender.toString() : undefined,
              // Detaylı bilgiler - API kaldırıldığı için null
              biography: null,
              birthDate: null,
              deathDate: null,
              placeOfBirth: null,
            },
          })
          .catch(() =>
            this.prisma.person.findFirst({
              where: { name: crewData.name },
            }),
          );

        if (!person) return;

        // Content ↔ Person ilişkisi (director)
        await this.prisma.contentPerson.upsert({
          where: {
            contentId_personId_personRoleId_character: {
              contentId,
              personId: person.id,
              personRoleId: null,
              character: "",
            },
          },
          update: {
            department: crewData.department,
            job: crewData.job,
            role: "director",
          },
          create: {
            contentId,
            personId: person.id,
            role: "director",
            department: crewData.department,
            job: crewData.job,
          },
        });

        console.log(`  ✅ Director kaydedildi: ${person.name} `);
      } catch (error) {
        console.error(`  ❌ Director kaydedilemedi: ${crewData.name} `, error);
      }
    }
  }

  /**
   * Images kaydet
   */
  private async saveImages(
    images: Array<{
      file_path: string;
      width?: number;
      height?: number;
      aspect_ratio?: number;
      iso_639_1?: string;
      vote_average?: number;
      vote_count?: number;
    }>,
    contentId: string,
    type: string,
  ) {
    // En fazla 5 tane poster/backdrop kaydet
    //!!! burası neden var
    const topImages = images.slice(0, 5);

    for (let i = 0; i < topImages.length; i++) {
      const imgData = topImages[i];
      try {
        // width, height, aspectRatio, language, isPrimary alanları kaldırıldı
        await this.prisma.contentImage.create({
          data: {
            contentId,
            type,
            filePath: imgData.file_path,
          },
        });
        console.log(`  ✅ ${type} kaydedildi: ${imgData.file_path} `);
      } catch (error) {
        console.error(`  ❌ ${type} kaydedilemedi: `, error);
      }
    }
  }

  /**
   * TMDB TV dizisini normalize yapıya kaydet
   */
  async saveTmdbTv(data: any, contentId: string) {
    console.log("📺 TMDB TV kaydediliyor:", data.name);

    try {
      // 1. Genres kaydet ve bağla
      if (data.genres && data.genres.length > 0) {
        await this.saveTmdbGenres(data.genres, contentId);
      }

      // 3. Languages kaydet ve bağla
      if (data.spoken_languages && data.spoken_languages.length > 0) {
        await this.saveLanguages(data.spoken_languages, contentId);
      }

      // 4. Original language kaydet
      if (data.original_language) {
        await this.saveOriginalLanguage(data.original_language, contentId);
      }

      // 5. Networks/Production companies kaydet
      if (data.production_companies && data.production_companies.length > 0) {
        await this.saveTmdbCompanies(data.production_companies, contentId);
      }

      // 6. Cast & Crew kaydet
      if (data.credits) {
        if (data.credits.cast && data.credits.cast.length > 0) {
          await this.saveTmdbCast(data.credits.cast, contentId);
        }
        if (data.credits.crew && data.credits.crew.length > 0) {
          await this.saveTmdbCrew(data.credits.crew, contentId);
        }
      }

      // 7. Images kaydet
      if (data.images) {
        if (data.images.posters && data.images.posters.length > 0) {
          await this.saveImages(data.images.posters, contentId, "poster");
        }
        if (data.images.backdrops && data.images.backdrops.length > 0) {
          await this.saveImages(data.images.backdrops, contentId, "backdrop");
        }
      }

      // 8. Seasons kaydet
      if (data.seasons && data.seasons.length > 0) {
        await this.saveTvSeasons(data, contentId);
      }

      // 12. Episodes kaydet (her season için)
      if (data.seasons && data.seasons.length > 0) {
        await this.saveTvEpisodes(data, contentId);
      }

      console.log("✅ TMDB TV başarıyla kaydedildi:", data.name);
    } catch (error) {
      console.error("❌ TMDB TV kaydedilemedi:", error);
      throw error;
    }
  }

  /**
   * TV seasons kaydet
   */
  private async saveTvSeasons(data: any, contentId: string) {
    try {
      if (
        !data.seasons ||
        !Array.isArray(data.seasons) ||
        data.seasons.length === 0
      ) {
        return;
      }

      console.log(`  📅 ${data.seasons.length} season kaydediliyor...`);

      for (const season of data.seasons) {
        if (typeof season.season_number !== "number") {
          console.warn("  ⚠️ Geçersiz season_number, kayıt atlandı:", season);
          continue;
        }

        // Check if season already exists before upserting
        const existingSeason = await this.prisma.tvSeason.findUnique({
          where: {
            tvShowId_seasonNumber: {
              tvShowId: contentId,
              seasonNumber: season.season_number,
            },
          },
        });

        const isNewSeason = !existingSeason;

        await this.prisma.tvSeason.upsert({
          where: {
            tvShowId_seasonNumber: {
              tvShowId: contentId,
              seasonNumber: season.season_number,
            },
          },
          update: {
            name: season.name || `Season ${season.season_number} `,
            overview: season.overview,
            airDate: season.air_date ? new Date(season.air_date) : null,
            episodeCount: season.episode_count || 0,
            posterUrl: season.poster_path,
          },
          create: {
            tvShowId: contentId,
            seasonNumber: season.season_number,
            name: season.name || `Season ${season.season_number} `,
            overview: season.overview,
            airDate: season.air_date ? new Date(season.air_date) : null,
            episodeCount: season.episode_count || 0,
            posterUrl: season.poster_path,
          },
        });

        // If this is a new season, notify users who have consumed the series
        if (isNewSeason) {
          await notifyUsersOfNewSeason(
            this.prisma,
            contentId,
            season.season_number,
          );
        }
      }

      console.log(`  ✅ ${data.seasons.length} season kaydedildi`);
    } catch (error) {
      console.error("  ❌ Seasons kaydedilemedi:", error);
    }
  }

  /**
   * TV episodes kaydet - Her sezon için bölümleri kaydeder
   * NOT: Frontend'den seasons detayı gelmişse kullanır, yoksa atlayabilir
   */
  private async saveTvEpisodes(data: any, contentId: string) {
    try {
      console.log("  📺 TV episodes kaydediliyor...");
      let totalEpisodesSaved = 0;
      const tmdbApiKey = process.env.TMDB_API_KEY;

      if (!tmdbApiKey) {
        console.error("  ❌ TMDB_API_KEY bulunamadı, episodes kaydedilemiyor");
        return;
      }

      // data.seasons array'inden season_number bilgilerini al
      if (data.seasons && Array.isArray(data.seasons)) {
        for (const season of data.seasons) {
          if (typeof season.season_number !== "number") {
            console.warn(
              "    ⚠️ Geçersiz season_number, episode kaydı atlandı:",
              season,
            );
            continue;
          }

          if (!season.episode_count || season.episode_count === 0) {
            continue;
          }

          try {
            // TMDB'den season detaylarını çek (episodes dahil)
            console.log(
              `    📡 Season ${season.season_number} detayları alınıyor...`,
            );

            // Önce season'ı database'den çek (ID için)
            const savedSeason = await this.prisma.tvSeason.findUnique({
              where: {
                tvShowId_seasonNumber: {
                  tvShowId: contentId,
                  seasonNumber: season.season_number,
                },
              },
            });

            if (!savedSeason) {
              console.error(
                `    ❌ Season ${season.season_number} database'de bulunamadı, önce season kaydetmelisiniz`,
              );
              continue;
            }

            // TMDB API v4 Bearer token kullanımı
            const seasonResponse = await fetch(
              `https://api.themoviedb.org/3/tv/${data.id}/season/${season.season_number}`,
              {
                headers: {
                  Authorization: `Bearer ${tmdbApiKey}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (!seasonResponse.ok) {
              const errorText = await seasonResponse.text().catch(() => "");
              console.error(
                `    ❌ Season ${season.season_number} detayları alınamadı:`,
                seasonResponse.status,
                errorText,
              );
              continue;
            }

            const seasonData = (await seasonResponse.json()) as any;

            // Episodes kaydet
            if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
              console.log(
                `    📝 Season ${season.season_number}: ${seasonData.episodes.length} episodes kaydediliyor`,
              );

              for (const episode of seasonData.episodes) {
                try {
                  await this.prisma.tvEpisode.upsert({
                    where: {
                      tvShowId_seasonNumber_episodeNumber: {
                        tvShowId: contentId,
                        seasonNumber: season.season_number,
                        episodeNumber: episode.episode_number,
                      },
                    },
                    update: {
                      seasonId: savedSeason.id,
                      name: episode.name || `Episode ${episode.episode_number}`,
                      overview: episode.overview,
                      airDate: episode.air_date
                        ? new Date(episode.air_date)
                        : null,
                      runtime: episode.runtime,
                    },
                    create: {
                      tvShowId: contentId,
                      seasonId: savedSeason.id,
                      seasonNumber: season.season_number,
                      episodeNumber: episode.episode_number,
                      name: episode.name || `Episode ${episode.episode_number}`,
                      overview: episode.overview,
                      airDate: episode.air_date
                        ? new Date(episode.air_date)
                        : null,
                      runtime: episode.runtime,
                    },
                  });
                  totalEpisodesSaved++;
                } catch (episodeError) {
                  console.error(
                    `    ❌ Episode ${season.season_number}x${episode.episode_number} kaydedilemedi:`,
                    episodeError,
                  );
                }
              }
            }
          } catch (seasonError) {
            console.error(
              `    ❌ Season ${season.season_number} işlenemedi:`,
              seasonError,
            );
          }
        }
      }

      console.log(`  ✅ ${totalEpisodesSaved} TV episode kaydedildi`);
    } catch (error) {
      console.error("  ❌ TV episodes kaydedilemedi:", error);
      // Episode kaydetme hatası ana işlemi durdurmasın
    }
  }

  /**
   * IGDB oyununu normalize yapıya kaydet
   */
  async saveIgdbGame(data: any, contentId: string) {
    console.log("🎮 IGDB Game kaydediliyor:", data.name);

    try {
      // 1. Poster kaydet (cover)
      if (data.cover?.image_id) {
        const posterUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${data.cover.image_id}.jpg`;

        // Check if already exists
        const existingPoster = await this.prisma.contentImage.findFirst({
          where: {
            contentId,
            type: "poster",
            filePath: posterUrl,
          },
        });

        if (!existingPoster) {
          // isPrimary alanı kaldırıldı
          await this.prisma.contentImage.create({
            data: {
              contentId,
              type: "poster",
              filePath: posterUrl,
            },
          });
          console.log("  ✅ Game poster kaydedildi");
        }
      }

      // 3. Backdrop kaydet (ilk screenshot)
      if (data.screenshots && data.screenshots.length > 0) {
        const screenshot = data.screenshots[0];
        if (screenshot.image_id) {
          const backdropUrl = `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${screenshot.image_id}.jpg`;

          // Check if already exists
          const existingBackdrop = await this.prisma.contentImage.findFirst({
            where: {
              contentId,
              type: "backdrop",
              filePath: backdropUrl,
            },
          });

          if (!existingBackdrop) {
            // isPrimary alanı kaldırıldı
            await this.prisma.contentImage.create({
              data: {
                contentId,
                type: "backdrop",
                filePath: backdropUrl,
              },
            });
            console.log("  ✅ Game backdrop kaydedildi");
          }
        }
      }

      console.log("✅ IGDB Game başarıyla kaydedildi:", data.name);
    } catch (error) {
      console.error("❌ IGDB Game kaydedilemedi:", error);
      throw error;
    }
  }

  /**
   * Google Book'u normalize yapıya kaydet
   */
  async saveGoogleBook(data: any, contentId: string) {
    console.log("📚 Google Book kaydediliyor:", data.title);

    try {
      // 1. Poster kaydet (thumbnail)
      // Google Books API'den gelen data zaten normalize edilmiş (saveContentFromGoogleBook'tan)
      // thumbnail direkt root'ta
      const thumbnailUrl =
        data.thumbnail || data.volumeInfo?.imageLinks?.thumbnail;

      if (thumbnailUrl) {
        console.log(`  📸 Thumbnail found: ${thumbnailUrl}`);

        // Check if already exists
        const existingPoster = await this.prisma.contentImage.findFirst({
          where: {
            contentId,
            type: "poster",
            filePath: thumbnailUrl,
          },
        });

        if (!existingPoster) {
          // isPrimary alanı kaldırıldı
          await this.prisma.contentImage.create({
            data: {
              contentId,
              type: "poster",
              filePath: thumbnailUrl,
            },
          });
          console.log("  ✅ Book poster kaydedildi");
        } else {
          console.log("  ⏭️  Book poster already exists");
        }
      } else {
        console.log("  ⚠️  No thumbnail found in book data");
      }

      console.log("✅ Google Book başarıyla kaydedildi:", data.title);
    } catch (error) {
      console.error("❌ Google Book kaydedilemedi:", error);
      throw error;
    }
  }
}
