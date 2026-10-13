'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Search,
  CheckCircle,
  XCircle,
  Trophy,
  ArrowRight,
  Home,
  RotateCcw,
  SkipForward,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useQuizGame, type SearchContentItem } from '../hooks/useQuizGame';

const EMPTY_SEARCH_ITEMS: SearchContentItem[] = [];

export default function QuizPlayPage() {
  const t = useTranslations('QuizPlay');
  return (
    <Suspense fallback={<div className="p-6 text-white">{t('loading')}</div>}>
      <QuizPlayPageInner />
    </Suspense>
  );
}

function QuizPlayPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('QuizPlay');

  const contentTypeId = parseInt(searchParams.get('type') || '1');

  const {
    gameState,
    setGameState,
    currentContentIndex,
    currentScreenshotIndex,
    results,
    elapsedSeconds,
    isWrongAnswer,
    searchQuery,
    setSearchQuery,
    showSearchResults,
    selectedResultIndex,
    setSelectedResultIndex,
    quiz,
    contentItems,
    currentContent,
    currentScreenshot,
    totalScreenshots,
    searchData,
    loading,
    searchLoading,
    error,
    refetch,
    totalScore,
    correctCount,
    accuracy,
    startGame,
    finishQuiz,
    handleAnswer,
    handlePass,
    continueAfterReveal,
    continueAfterCorrectReveal,
    getContentDetails,
  } = useQuizGame(contentTypeId, t);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for search results
  const searchItems = searchData?.searchContent?.items ?? EMPTY_SEARCH_ITEMS;
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSearchResults || searchItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResultIndex((prev) => {
          const next = prev < searchItems.length - 1 ? prev + 1 : 0;
          setTimeout(() => {
            const container = resultsContainerRef.current;
            const items = container?.querySelectorAll('[data-result-item]');
            items?.[next]?.scrollIntoView({ block: 'nearest' });
          }, 0);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResultIndex((prev) => {
          const next = prev > 0 ? prev - 1 : searchItems.length - 1;
          setTimeout(() => {
            const container = resultsContainerRef.current;
            const items = container?.querySelectorAll('[data-result-item]');
            items?.[next]?.scrollIntoView({ block: 'nearest' });
          }, 0);
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedResultIndex >= 0 && selectedResultIndex < searchItems.length) {
          handleAnswer(searchItems[selectedResultIndex].id);
        }
      }
    },
    [showSearchResults, searchItems, selectedResultIndex, setSelectedResultIndex, handleAnswer]
  );

  // Auto focus input when question changes
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentContentIndex, currentScreenshotIndex, gameState]);

  // Enter tuşu ile revealed modal'dan devam et
  useEffect(() => {
    if (gameState !== 'revealed' && gameState !== 'revealed-correct') return;

    let isActive = false;
    const activateTimer = setTimeout(() => {
      isActive = true;
    }, 300);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (gameState === 'revealed-correct') {
          continueAfterCorrectReveal();
        } else {
          continueAfterReveal();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      clearTimeout(activateTimer);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [gameState, continueAfterCorrectReveal, continueAfterReveal]);

  const getContentTypePath = (typeId: number) => {
    switch (typeId) {
      case 1:
        return 'movie';
      case 2:
        return 'tv';
      case 3:
        return 'game';
      case 4:
        return 'book';
      case 5:
        return 'music';
      default:
        return 'movie';
    }
  };

  // Loading
  if (loading || gameState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white text-xl">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-gray-800 rounded-2xl">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('errorTitle')}</h2>
          <p className="text-gray-400 mb-6">{error.message}</p>
          <button
            onClick={() => router.push('/quiz')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            {t('backToQuiz')}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'empty') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center bg-gray-800/50 backdrop-blur rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-white mb-3">{t('emptyTitle')}</h1>
          <p className="text-gray-400 mb-6">{t('emptyDescription')}</p>
          <button
            onClick={() => router.push('/quiz')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            {t('backToQuiz')}
          </button>
        </div>
      </div>
    );
  }

  // Ready state
  if (gameState === 'ready') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center bg-gray-800/50 backdrop-blur rounded-3xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">{quiz.contentTypeName} Quiz</h1>
          <p className="text-gray-400 mb-8">
            {t('itemsCount', { count: contentItems.length })} • {t('noTimeLimit')}
          </p>

          <div className="space-y-4 mb-8 text-left bg-gray-700/50 rounded-xl p-6">
            <h3 className="font-semibold text-white">{t('rulesTitle')}</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {t('rule1')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {t('rule2')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {t('rule3')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {t('rule4')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {t('rule5')}
              </li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 hover: text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105"
          >
            {t('start')}
          </button>
        </div>
      </div>
    );
  }

  // Finished state
  if (gameState === 'finished') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800/50 backdrop-blur rounded-3xl p-8">
          {/* Trophy */}
          <div className="text-center mb-8">
            <Trophy
              className={`w-20 h-20 mx-auto mb-4 ${accuracy >= 70 ? 'text-yellow-500' : 'text-gray-500'}`}
            />
            <h1 className="text-3xl font-bold text-white mb-2">{t('completed')}</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{totalScore}</div>
              <div className="text-gray-400 text-sm">{t('totalScore')}</div>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">
                {correctCount}/{results.length}
              </div>
              <div className="text-gray-400 text-sm">{t('correct')}</div>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">%{accuracy}</div>
              <div className="text-gray-400 text-sm">{t('accuracy')}</div>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">{elapsedSeconds}s</div>
              <div className="text-gray-400 text-sm">{t('time')}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                setGameState('loading');
                refetch();
              }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              {t('playAgain')}
            </button>
            <button
              onClick={() => router.push('/quiz')}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              {t('home')}
            </button>
            <button
              onClick={() => router.push(`/quiz/leaderboard?type=${contentTypeId}`)}
              className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 hover: text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              {t('leaderboard')}
            </button>
          </div>

          {/* Results Summary */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">{t('results')}</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => {
                const content = contentItems.find((c) => c.contentId === result.contentId);
                const contentUrl = `/content/${getContentTypePath(contentTypeId)}/${result.contentId}`;
                return (
                  <div
                    key={result.contentId}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.wasCorrect ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    {result.wasCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    {content?.posterUrl && (
                      <a
                        href={contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-[112px] h-[160px] rounded overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
                      >
                        <Image
                          src={content.posterUrl}
                          alt={content.title}
                          fill
                          className="object-cover"
                        />
                      </a>
                    )}
                    <a
                      href={contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white flex-1 hover:text-gray-300 transition-colors"
                    >
                      {content?.title}
                    </a>
                    <span className="text-gray-400 text-sm">
                      {t('photoCount', { count: result.screenshotsUsed })}
                    </span>
                    {result.wasCorrect && (
                      <span className="text-green-400 font-semibold">
                        +{t('points', { count: result.pointsEarned })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playing state (+ revealed modal overlay)
  const isRevealedState = gameState === 'revealed' || gameState === 'revealed-correct';
  const isCorrectReveal = gameState === 'revealed-correct';
  const revealDetails = isRevealedState ? getContentDetails(currentContent) : null;
  const lastResult = isCorrectReveal ? results[results.length - 1] : null;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-gray-800/90 backdrop-blur z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Progress */}
          <div className="flex items-center gap-4">
            <span className="text-white font-semibold">
              {currentContentIndex + 1} / {contentItems.length}
            </span>
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${((currentContentIndex + 1) / contentItems.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Screenshot counter */}
          <div className="text-gray-400 text-sm">
            {t('photoIndex', { current: currentScreenshotIndex + 1, total: totalScreenshots })}
          </div>

          {/* Score */}
          <div className="text-yellow-400 font-bold">{t('points', { count: totalScore })}</div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 pb-8 px-4">
        <div className="max-w-screen-xl mx-auto">
          {/* Screenshot */}
          <div
            className={`relative aspect-video rounded-2xl overflow-hidden mb-6 bg-gray-800 transition-all duration-300 ${isWrongAnswer ? 'animate-shake ring-4 ring-red-500/70' : ''}`}
          >
            {currentScreenshot && (
              <Image
                src={currentScreenshot.imageUrl}
                alt="Screenshot"
                fill
                className="object-contain"
                priority
              />
            )}
            {/* Difficulty badge */}
            {currentScreenshot &&
              (() => {
                const d = currentScreenshot.difficulty;
                const label =
                  d <= 1
                    ? t('difficulty.veryEasy')
                    : d === 2
                      ? t('difficulty.easy')
                      : d === 3
                        ? t('difficulty.medium')
                        : d === 4
                          ? t('difficulty.hard')
                          : t('difficulty.veryHard');
                const color =
                  d <= 1
                    ? 'bg-green-500'
                    : d === 2
                      ? 'bg-lime-500'
                      : d === 3
                        ? 'bg-yellow-500'
                        : d === 4
                          ? 'bg-orange-500'
                          : 'bg-red-500';
                return (
                  <span
                    className={`absolute top-3 right-3 ${color} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg`}
                  >
                    {label}
                  </span>
                );
              })()}
            {/* Wrong answer red overlay */}
            {isWrongAnswer && (
              <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
            )}
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-12 pr-4 py-4 bg-gray-800 rounded-xl text-white text-lg placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              autoFocus
              disabled={isWrongAnswer}
            />

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div
                ref={resultsContainerRef}
                className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-xl overflow-hidden shadow-xl z-40 max-h-64 overflow-y-auto"
              >
                {searchLoading ? (
                  <div className="p-4 text-center text-gray-400">{t('searching')}</div>
                ) : searchItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">{t('noResults')}</div>
                ) : (
                  searchItems.map((item, index) => (
                    <button
                      key={item.id}
                      data-result-item
                      onClick={() => handleAnswer(item.id)}
                      className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${
                        index === selectedResultIndex ? 'bg-blue-600/40' : 'hover:bg-gray-700'
                      }`}
                    >
                      {item.posterUrl && (
                        <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={item.posterUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <span className="text-white">{item.title}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pass Button */}
          <button
            onClick={handlePass}
            disabled={isWrongAnswer || isRevealedState}
            className={`w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2 ${isWrongAnswer || isRevealedState ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <SkipForward className="w-5 h-5" />
            {t('pass')}
          </button>
        </div>
      </div>

      {/* Revealed Modal Overlay */}
      {isRevealedState && revealDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Dialog */}
          <div className="relative max-w-5xl w-full bg-gray-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              {isCorrectReveal ? (
                <>
                  <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-white">{t('correctAnswerTitle')}</h2>
                    {lastResult && (
                      <p className="text-green-400 font-semibold">
                        +{t('points', { count: lastResult.pointsEarned })}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-red-500 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-white">{t('wrong')}</h2>
                    <p className="text-gray-400 text-sm">{t('correctAnswerDesc')}</p>
                  </div>
                </>
              )}
            </div>

            {/* Content Details */}
            <div className="bg-gray-700 rounded-xl p-4 mb-5">
              <div className="flex gap-4 mb-4">
                {currentContent?.posterUrl ? (
                  <a
                    href={`/content/${getContentTypePath(contentTypeId)}/${currentContent.contentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-48 h-72 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-transparent hover:ring-gray-400 transition-all"
                  >
                    <Image
                      src={currentContent.posterUrl}
                      alt={currentContent.title}
                      fill
                      className="object-cover"
                    />
                  </a>
                ) : null}
                <div className="flex-1 min-w-0">
                  <a
                    href={`/content/${getContentTypePath(contentTypeId)}/${currentContent?.contentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-bold text-white hover:text-gray-300 transition-colors mb-2 block"
                  >
                    {currentContent?.title}
                  </a>
                  {currentContent?.releaseDate && (
                    <p className="text-gray-400 text-sm mb-1">
                      📅 {new Date(currentContent.releaseDate).getFullYear()}
                    </p>
                  )}
                  {currentContent?.runtime && (
                    <p className="text-gray-400 text-sm mb-1">⏱️ {currentContent.runtime} dk</p>
                  )}
                  {currentContent?.authors && currentContent.authors.length > 0 && (
                    <p className="text-gray-400 text-sm mb-1">
                      ✍️ {currentContent.authors.join(', ')}
                    </p>
                  )}
                  {revealDetails.directors.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-gray-400 text-sm">🎬</span>
                      {revealDetails.directors.map((d, idx) => (
                        <a
                          key={`${d.personId}-${idx}`}
                          href={`/person/${d.personId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-300 text-sm hover:text-gray-100 transition-colors"
                        >
                          {d.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {revealDetails.actors.length > 0 && (
                <div className="mb-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Oyuncular</p>
                  <div className="flex flex-wrap gap-2">
                    {revealDetails.actors.map((a, idx) => (
                      <a
                        key={`${a.personId}-${idx}`}
                        href={`/person/${a.personId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 text-sm bg-gray-600 hover:bg-gray-500 hover:text-gray-100 px-2 py-0.5 rounded-full transition-colors"
                      >
                        {a.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {currentContent?.description && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                    {t('description')}
                  </p>
                  <p className="text-gray-300 text-sm line-clamp-4">{currentContent.description}</p>
                </div>
              )}
            </div>

            {/* Screenshots */}
            {currentContent?.screenshots && currentContent.screenshots.length > 0 && (
              <div className="mb-5">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
                  {t('screenshots')}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentContent.screenshots.map((ss, idx) => (
                    <div
                      key={ss.id}
                      className="relative flex-shrink-0 w-72 aspect-video rounded-lg overflow-hidden bg-gray-700"
                    >
                      <Image
                        src={ss.imageUrl}
                        alt={`Screenshot ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={isCorrectReveal ? continueAfterCorrectReveal : continueAfterReveal}
              className={`w-full py-3 text-white text-base font-bold rounded-xl flex items-center justify-center gap-2 ${
                isCorrectReveal
                  ? 'bg-green-700 hover:bg-green-800'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              {currentContentIndex < contentItems.length - 1 ? t('nextContent') : t('showResults')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
