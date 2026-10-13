'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { findMovies, fetchTmdbScreenshots, type MovieSuggestion } from './actions';
import { SearchIcon, FilmIcon } from '@/components/atoms/icons/SidebarIcons';
import { searchContent } from '../explore/[type]/hooks/contentSearch';
import PosterCard from '@/components/atoms/PosterCard';
import Link from 'next/link';
import type { UnifiedContent } from '@/types/unified-content';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';

interface EnrichedMovieSuggestion extends MovieSuggestion {
  dbItem: UnifiedContent;
  tmdbScreenshots?: string[];
}

export default function MovieFinderPage() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EnrichedMovieSuggestion[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const screenshotDialogRef = useRef<HTMLDivElement>(null);
  const screenshotCloseButtonRef = useRef<HTMLButtonElement>(null);
  const screenshotTriggerRef = useRef<HTMLButtonElement | null>(null);
  const t = useTranslations('MovieFinder');

  useEffect(() => {
    if (!selectedImage) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    screenshotCloseButtonRef.current?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImage(null);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = screenshotDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements?.length) {
        event.preventDefault();
        screenshotCloseButtonRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      screenshotTriggerRef.current?.focus();
      screenshotTriggerRef.current = null;
    };
  }, [selectedImage]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setResults([]);
    try {
      const suggestions = await findMovies(description);

      const enrichedResults: EnrichedMovieSuggestion[] = [];

      for (const suggestion of suggestions) {
        try {
          // Arama sonuçlarını DB'den getir, contentTypeId = 1 (Movie)
          const searchResult = await searchContent(suggestion.title, 1, 1, 3);

          if (searchResult.items && searchResult.items.length > 0) {
            // Yıla göre eşleşen veya ilk bulduğunu al
            const matchedMovie =
              searchResult.items.find((m: UnifiedContent) => {
                if (!m.releaseDate) return true;
                const movieYear = new Date(m.releaseDate).getFullYear();
                return Math.abs(movieYear - suggestion.year) <= 2;
              }) || searchResult.items[0];

            // Eğer veri tabanımızda ekran görüntüsü yoksa TMDB'den çek
            let tmdbScreenshots: string[] = [];
            if (!matchedMovie.screenshots || matchedMovie.screenshots.length === 0) {
              const tmdbId = parseInt(matchedMovie.id, 10);
              if (!isNaN(tmdbId)) {
                tmdbScreenshots = await fetchTmdbScreenshots(tmdbId);
              }
            }

            enrichedResults.push({
              ...suggestion,
              dbItem: matchedMovie,
              tmdbScreenshots,
            });
          }
        } catch (err) {
          console.error('Error fetching details for', suggestion.title, err);
        }
      }

      setResults(enrichedResults);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-12 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-violet-900/20 blur-3xl opacity-50"></div>
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-violet-500 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
            <FilmIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-6 text-white">{t('title')}</h1>
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">{t('description')}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-12 relative">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute -inset-1 bg-violet-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-3 flex flex-col sm:flex-row gap-4 shadow-2xl">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('placeholder')}
                className="flex-1 bg-transparent border-none text-white placeholder-gray-600 p-4 min-h-[140px] resize-none focus:ring-0 text-xl rounded-2xl outline-none"
                disabled={loading}
              />
              <div className="flex sm:flex-col justify-end p-2">
                <button
                  type="submit"
                  disabled={loading || !description.trim()}
                  className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white px-8 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105 disabled:hover:scale-100 w-full sm:w-[180px] h-[72px]"
                >
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
                      <span>{t('finding')}</span>
                    </>
                  ) : (
                    <>
                      <SearchIcon className="w-7 h-7" />
                      <span>{t('find')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Results Area */}
          {results.length > 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-bg-bottom-4 duration-700">
              <div className="flex items-center gap-4">
                <span className="w-12 h-1 bg-violet-500 rounded-full"></span>
                <h2 className="text-3xl font-bold">{t('possibleMatches')}</h2>
                <span className="w-full h-[1px] bg-gray-800 flex-1"></span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.map((movie, index) => {
                  // Prioritize database screenshots, fallback to TMDB screenshots, fallback to backdropUrl
                  let screenshotUrls = movie.dbItem.screenshots?.map((s) => s.imageUrl) || [];
                  if (
                    screenshotUrls.length === 0 &&
                    movie.tmdbScreenshots &&
                    movie.tmdbScreenshots.length > 0
                  ) {
                    screenshotUrls = movie.tmdbScreenshots;
                  }
                  if (screenshotUrls.length === 0 && movie.dbItem.backdropUrl) {
                    screenshotUrls = [movie.dbItem.backdropUrl];
                  }

                  const screenshots = Array.from(new Set(screenshotUrls.filter(Boolean)));

                  return (
                    <article
                      key={index}
                      className="relative flex flex-col bg-gray-900/40 border border-gray-800/60 rounded-3xl hover:bg-gray-800/80 hover:border-violet-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 group backdrop-blur-sm overflow-hidden"
                    >
                      {/* Backdrop blurred background overlay */}
                      {movie.dbItem.backdropUrl && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-5 pointer-events-none transition-opacity duration-500 group-hover:opacity-10"
                          style={{
                            backgroundImage: `url(${movie.dbItem.backdropUrl})`,
                            filter: 'blur(20px)',
                          }}
                        />
                      )}

                      <Link
                        href={`/content/movie/${movie.dbItem.id}`}
                        className="relative z-10 flex flex-row gap-4 sm:gap-6 p-4 sm:p-5 flex-1"
                      >
                        <div className="w-[100px] sm:w-[130px] shrink-0">
                          <PosterCard
                            src={movie.dbItem.posterUrl}
                            alt={movie.title}
                            hoverZoom={false}
                            rounded="lg"
                            useNextImage={false}
                            className="shadow-md h-auto"
                          />
                        </div>

                        <div className="flex flex-col flex-1 py-1">
                          <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-violet-400 transition-colors mb-2">
                            {movie.title}
                          </h3>
                          <div className="mb-4">
                            <span className="inline-block px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-xs sm:text-sm font-medium">
                              {movie.year}
                            </span>
                          </div>

                          <div className="mt-auto bg-black/30 p-3 sm:p-4 rounded-xl border border-gray-800/50">
                            <span className="text-violet-400 text-xs sm:text-sm font-semibold mb-1 flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {t('whyMatched')}
                            </span>
                            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                              {movie.reason}
                            </p>
                          </div>
                        </div>
                      </Link>

                      {/* Screenshots gallery at the bottom */}
                      {screenshots.length > 0 && (
                        <div className="relative z-10 px-4 pb-4 sm:px-5 sm:pb-5 pt-0 border-t border-gray-800/20">
                          <span className="text-gray-500 text-[10px] sm:text-xs font-semibold mb-2 mt-3 block tracking-wider uppercase">
                            {t('screenshots')}
                          </span>
                          <div className="flex gap-2.5 overflow-x-auto scrollbar-hidden py-1">
                            {screenshots.map((url, imgIndex) => (
                              <button
                                key={imgIndex}
                                type="button"
                                aria-label={t('screenshotThumbnailAlt', {
                                  index: imgIndex + 1,
                                  title: movie.title,
                                })}
                                onClick={(event) => {
                                  screenshotTriggerRef.current = event.currentTarget;
                                  setSelectedImage(url);
                                }}
                                className="relative w-[130px] sm:w-[170px] aspect-video shrink-0 rounded-xl overflow-hidden border border-gray-800/80 group-hover:border-violet-500/20 transition-all duration-300 shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                              >
                                <Image
                                  src={url}
                                  alt=""
                                  fill
                                  sizes="(min-width: 640px) 170px, 130px"
                                  unoptimized
                                  className="object-cover transform hover:scale-105 transition-transform duration-500"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <div
            ref={screenshotDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('largeScreenshotAlt')}
            tabIndex={-1}
            className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={screenshotCloseButtonRef}
              type="button"
              aria-label={t('closeScreenshot')}
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-violet-400 transition-colors bg-black/50 hover:bg-black/80 rounded-full p-2 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <svg
                aria-hidden="true"
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <Image
              src={selectedImage}
              alt={t('largeScreenshotAlt')}
              fill
              sizes="(min-width: 1280px) 1280px, 100vw"
              unoptimized
              className="object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}
