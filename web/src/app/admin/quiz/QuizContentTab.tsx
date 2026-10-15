'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, Trash2, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from './quizTypes';
import type { Screenshot } from './quizTypes';
import { useMemo } from 'react';
import { Pagination } from '@/components/molecules/Pagination';
import toast from 'react-hot-toast';
import { AlertTriangle, ImageIcon, ImageOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

type FilterMode = 'all' | 'quiz' | 'has-screenshot' | 'no-screenshot';

const SHORT_DIFFICULTY_LABELS = ['ÇK', 'Kolay', 'Orta', 'Zor', 'ÇZ'];
const ALL_DIFFICULTIES = [1, 2, 3, 4, 5];
const CONTENT_TYPE_SLUGS: Record<number, 'movie' | 'tv' | 'game' | 'book'> = {
  1: 'movie',
  2: 'tv',
  3: 'game',
  4: 'book',
};

interface QuizContentTabProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentPage: number;
  setCurrentPage: (fn: (p: number) => number) => void;
  searchLoading: boolean;
  searchData: any;
  selectedContent: any;
  setSelectedContent: (content: any) => void;
  screenshots: Screenshot[];
  screenshotsLoading: boolean;
  enabledContentCount: number;
  enabledCount: number;
  toggleScreenshot: (options: { variables: { id: number; enabled: boolean } }) => void;
  deleteScreenshot: (options: { variables: { id: number } }) => void;
  onDifficultyChange: (id: number, difficulty: number, currentEnabledStatus?: boolean) => void;
  filterMode: FilterMode;
  setFilterMode: (m: FilterMode) => void;
}

export function QuizContentTab({
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  searchLoading,
  searchData,
  selectedContent,
  setSelectedContent,
  screenshots,
  screenshotsLoading,
  enabledContentCount,
  enabledCount,
  toggleScreenshot,
  deleteScreenshot,
  onDifficultyChange,
  filterMode,
  setFilterMode,
}: QuizContentTabProps) {
  const t = useTranslations('AdminQuizPage');

  // filterMode is lifted to the parent hook so server-side filtering is used

  const sortedItems = useMemo(() => {
    const items = searchData?.searchContent?.items ?? [];
    // Filter
    const filtered = items.filter((c: any) => {
      const sc = c.screenshotCount ?? 0;
      const esc = c.enabledScreenshotCount ?? 0;
      switch (filterMode) {
        case 'quiz':
          return esc >= 5;
        case 'has-screenshot':
          return sc > 0;
        case 'no-screenshot':
          return sc === 0;
        default:
          return true;
      }
    });
    // Sort: screenshot-having first, then by enabledScreenshotCount desc
    return [...filtered].sort((a: any, b: any) => {
      const aHas = (a.screenshotCount ?? 0) > 0 ? 1 : 0;
      const bHas = (b.screenshotCount ?? 0) > 0 ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return (b.enabledScreenshotCount ?? 0) - (a.enabledScreenshotCount ?? 0);
    });
  }, [searchData, filterMode]);

  const coverageMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of screenshots) {
      if (s.isEnabledForQuiz) {
        map.set(s.difficulty, (map.get(s.difficulty) ?? 0) + 1);
      }
    }
    return map;
  }, [screenshots]);

  const allDifficultiesCovered = ALL_DIFFICULTIES.every((d) => (coverageMap.get(d) ?? 0) > 0);

  console.log(
    'QuizContentTab Rendering, searchLoading:',
    searchLoading,
    'items:',
    searchData?.searchContent?.items?.length
  );

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900/50 rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">{t('contentTab.title')}</h3>
          <p className="text-sm text-neutral-400">{t('contentTab.desc')}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(() => 1);
              }}
              placeholder={t('contentTab.searchPh')}
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 rounded-lg text-white placeholder-neutral-500"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'all' as FilterMode, label: t('contentTab.filters.all'), icon: null },
              {
                key: 'quiz' as FilterMode,
                label: t('contentTab.filters.quiz'),
                icon: <CheckCircle className="w-3.5 h-3.5" />,
              },
              {
                key: 'has-screenshot' as FilterMode,
                label: t('contentTab.filters.hasImg'),
                icon: <ImageIcon className="w-3.5 h-3.5" />,
              },
              {
                key: 'no-screenshot' as FilterMode,
                label: t('contentTab.filters.noImg'),
                icon: <ImageOff className="w-3.5 h-3.5" />,
              },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setFilterMode(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterMode === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {searchLoading && (
            <div className="text-center py-8 text-neutral-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2" />
              {t('contentTab.loading')}
            </div>
          )}

          {!searchLoading && sortedItems.length === 0 && (
            <div className="text-center py-8 text-neutral-400">{t('contentTab.empty')}</div>
          )}

          {sortedItems.map((content: any) => {
            const count = content.enabledScreenshotCount ?? 0;
            const totalSS = content.screenshotCount ?? 0;
            const isEligible = count >= 5;
            const contentHref = `/content/${CONTENT_TYPE_SLUGS[content.contentTypeId] ?? 'movie'}/${content.id}`;
            return (
              <div key={content.id} className="bg-neutral-800/50 rounded-xl overflow-hidden">
                <div
                  className={`flex gap-4 p-2 cursor-pointer transition-colors ${
                    selectedContent?.id === content.id ? 'bg-white/5' : 'hover:bg-white/5'
                  }`}
                  onClick={() =>
                    setSelectedContent(selectedContent?.id === content.id ? null : content)
                  }
                >
                  <div className="flex-shrink-0">
                    <Link
                      href={contentHref as any}
                      onClick={(e) => e.stopPropagation()}
                      className="block rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                      aria-label={`${content.title} içerik sayfasına git`}
                    >
                      {content.posterUrl ? (
                        <Image
                          src={content.posterUrl}
                          alt={content.title}
                          width={80}
                          height={120}
                          className="rounded object-cover w-[80px] h-[120px]"
                        />
                      ) : (
                        <div className="w-[80px] h-[120px] bg-neutral-800 rounded flex items-center justify-center">
                          <span className="text-xs text-neutral-500">
                            {t('contentTab.noCover')}
                          </span>
                        </div>
                      )}
                    </Link>
                  </div>

                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="text-white font-medium truncate">{content.title}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {t('contentTab.images', { totalSS })}
                    </p>
                    {isEligible ? (
                      <p className="text-sm text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {t('contentTab.activeInQuiz', { count })}
                      </p>
                    ) : (
                      <p className="text-sm text-amber-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {t('contentTab.passiveInQuiz', { count })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center text-neutral-500 pr-2">
                    {selectedContent?.id === content.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {selectedContent?.id === content.id && (
                  <div className="border-t border-neutral-700 p-4 bg-neutral-900/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-white">{t('contentTab.screenshots')}</h4>
                        <p className="text-sm text-neutral-400">
                          {t('contentTab.screenshotsCount', {
                            length: screenshots.length,
                            activeLength: screenshots.filter((s: any) => s.isEnabledForQuiz).length,
                          })}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ALL_DIFFICULTIES.map((d) => {
                            const cnt = coverageMap.get(d) ?? 0;
                            return (
                              <span
                                key={d}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  cnt > 0
                                    ? `${DIFFICULTY_COLORS[d - 1]} text-white`
                                    : 'bg-neutral-700 text-neutral-500'
                                }`}
                              >
                                {d === 1
                                  ? t('difficulty.ve')
                                  : d === 2
                                    ? t('difficulty.e')
                                    : d === 3
                                      ? t('difficulty.m')
                                      : d === 4
                                        ? t('difficulty.h')
                                        : t('difficulty.vh')}
                                : {cnt}
                              </span>
                            );
                          })}
                          {!allDifficultiesCovered &&
                            screenshots.filter((s: any) => s.isEnabledForQuiz).length > 0 && (
                              <span className="text-xs text-amber-400 flex items-center gap-1 ml-1">
                                <AlertTriangle className="w-3 h-3" />
                                {t('contentTab.missingLevels')}
                              </span>
                            )}
                        </div>
                      </div>
                      <Link
                        href={`/add-content?id=${content.id}`}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        {t('contentTab.editContent')}
                      </Link>
                    </div>

                    {screenshotsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto" />
                      </div>
                    ) : screenshots.length === 0 ? (
                      <div className="text-center py-4 text-neutral-400">
                        <p>{t('contentTab.noScreenshots')}</p>
                        <Link
                          href={`/add-content?id=${content.id}`}
                          className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                        >
                          {t('contentTab.addScreenshot')}
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {screenshots.map((screenshot: any) => (
                          <div
                            key={screenshot.id}
                            className="bg-neutral-800/50 rounded-lg overflow-hidden"
                          >
                            <div className="aspect-video relative">
                              <Image
                                src={screenshot.imageUrl}
                                alt="Screenshot"
                                fill
                                className="object-cover"
                              />
                              <button
                                onClick={() =>
                                  toggleScreenshot({
                                    variables: {
                                      id: screenshot.id,
                                      enabled: !screenshot.isEnabledForQuiz,
                                    },
                                  })
                                }
                                className={`
                                  absolute top-2 right-2 p-1.5 rounded-full transition-colors
                                  ${
                                    screenshot.isEnabledForQuiz
                                      ? 'bg-green-500 text-white'
                                      : 'bg-neutral-900/80 text-neutral-400 hover:text-white'
                                  }
                                `}
                              >
                                {screenshot.isEnabledForQuiz ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            <div className="p-2 space-y-2">
                              <div>
                                <label className="text-xs text-neutral-400 mb-1 block">
                                  {t('contentTab.difficultyLabel', {
                                    label:
                                      screenshot.difficulty === 1
                                        ? t('difficulty.veryEasy')
                                        : screenshot.difficulty === 2
                                          ? t('difficulty.easy')
                                          : screenshot.difficulty === 3
                                            ? t('difficulty.medium')
                                            : screenshot.difficulty === 4
                                              ? t('difficulty.hard')
                                              : t('difficulty.veryHard'),
                                  })}
                                </label>
                                <div className="flex gap-0.5">
                                  {ALL_DIFFICULTIES.map((level) => (
                                    <button
                                      key={level}
                                      onClick={() =>
                                        onDifficultyChange(
                                          screenshot.id,
                                          level,
                                          screenshot.isEnabledForQuiz
                                        )
                                      }
                                      className={`
                                        flex-1 py-0.5 rounded text-xs font-medium transition-colors
                                        ${
                                          level === screenshot.difficulty
                                            ? `${DIFFICULTY_COLORS[level - 1]} text-white`
                                            : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                                        }
                                      `}
                                      title={
                                        level === 1
                                          ? t('difficulty.veryEasy')
                                          : level === 2
                                            ? t('difficulty.easy')
                                            : level === 3
                                              ? t('difficulty.medium')
                                              : level === 4
                                                ? t('difficulty.hard')
                                                : t('difficulty.veryHard')
                                      }
                                    >
                                      {level === 1
                                        ? t('difficulty.ve')
                                        : level === 2
                                          ? t('difficulty.e')
                                          : level === 3
                                            ? t('difficulty.m')
                                            : level === 4
                                              ? t('difficulty.h')
                                              : t('difficulty.vh')}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <button
                                  onClick={() => {
                                    if (confirm(t('contentTab.deleteConfirm'))) {
                                      deleteScreenshot({ variables: { id: screenshot.id } });
                                    }
                                  }}
                                  className="p-1 text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={searchData?.searchContent?.totalPages ?? 1}
          onPageChange={(page) => setCurrentPage(() => page)}
        />
      </div>
    </div>
  );
}
