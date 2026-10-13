import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export const START_QUIZ_V2 = gql`
  query StartQuizV2($contentTypeId: Int!) {
    startQuizV2(contentTypeId: $contentTypeId) {
      contentItems {
        contentId
        title
        posterUrl
        description
        releaseDate
        runtime
        authors
        persons {
          personId
          name
          role
          job
          character
        }
        screenshots {
          id
          imageUrl
          difficulty
        }
      }
      contentTypeId
      contentTypeName
      pointsLevel1
      pointsLevel2
      pointsLevel3
      pointsLevel4
      pointsLevel5
    }
  }
`;

export const SEARCH_CONTENT = gql`
  query SearchContent($searchQuery: String, $contentTypeId: Int, $limit: Int) {
    searchContent(searchQuery: $searchQuery, contentTypeId: $contentTypeId, limit: $limit) {
      items {
        id
        title
        posterUrl
      }
    }
  }
`;

export const SUBMIT_QUIZ = gql`
  mutation SubmitQuiz($input: SubmitQuizInput!) {
    submitQuiz(input: $input) {
      score
      correctAnswers
      totalQuestions
      timeTaken
      answerResults {
        screenshotId
        isCorrect
        correctContentId
        correctTitle
        pointsEarned
      }
      newRank
      isNewBestScore
    }
  }
`;

export interface QuizPerson {
  personId: string;
  name: string;
  role?: string;
  job?: string;
  character?: string;
}

export interface ContentItem {
  contentId: string;
  title: string;
  posterUrl?: string;
  description?: string;
  releaseDate?: string;
  runtime?: number;
  authors?: string[];
  persons?: QuizPerson[];
  screenshots: { id: number; imageUrl: string; difficulty: number }[];
}

const EMPTY_CONTENT_ITEMS: ContentItem[] = [];

export interface SearchContentItem {
  id: string;
  title: string;
  posterUrl?: string | null;
}

interface SearchContentResponse {
  searchContent?: { items: SearchContentItem[] } | null;
}

export interface ContentResult {
  contentId: string;
  wasCorrect: boolean;
  screenshotsUsed: number;
  pointsEarned: number;
}

export type GameState =
  | 'loading'
  | 'empty'
  | 'ready'
  | 'playing'
  | 'revealed'
  | 'revealed-correct'
  | 'finished';

export function useQuizGame(contentTypeId: number, t: any) {
  const { user } = useAuth();

  const [gameState, setGameState] = useState<GameState>('loading');
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0);
  const [results, setResults] = useState<ContentResult[]>([]);
  const gameStartedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWrongAnswer, setIsWrongAnswer] = useState(false);

  const [searchQuery, setSearchQueryState] = useState('');
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const showSearchResults = searchQuery.length >= 2;
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setSelectedResultIndex(query.length >= 2 ? 0 : -1);
  }, []);

  const { data, loading, error, refetch } = useQuery(START_QUIZ_V2, {
    variables: { contentTypeId },
    fetchPolicy: 'network-only',
  });

  const [searchContent, { data: searchData, loading: searchLoading }] =
    useLazyQuery<SearchContentResponse>(SEARCH_CONTENT);

  const [submitQuiz] = useMutation<any, any>(SUBMIT_QUIZ, {
    onCompleted: (data: any) => console.log('[QuizPlay] Quiz submitted:', data.submitQuiz),
    onError: (err: any) => {
      console.error('[QuizPlay] Error submitting quiz:', err);
      toast.error(t('resultsNotSaved'));
    },
  });

  const quiz = (data as any)?.startQuizV2;
  const contentItems: ContentItem[] = quiz?.contentItems ?? EMPTY_CONTENT_ITEMS;
  const resolvedGameState =
    gameState === 'loading' && !loading ? (contentItems.length > 0 ? 'ready' : 'empty') : gameState;
  const currentContent = contentItems[currentContentIndex];
  const currentScreenshot = currentContent?.screenshots[currentScreenshotIndex];
  const totalScreenshots = currentContent?.screenshots.length || 0;

  useEffect(() => {
    if (!loading && error) {
      console.error('[QuizPlay] Error loading quiz:', error);
      toast.error((error as any)?.message || t('quizNotLoaded'));
    }
  }, [loading, error, t]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchContent({ variables: { searchQuery, contentTypeId, limit: 10 } });
    }
  }, [searchQuery, contentTypeId, searchContent]);

  const calculatePoints = (difficulty: number): number => {
    if (!quiz) return 0;
    if (difficulty <= 1) return quiz.pointsLevel1;
    if (difficulty === 2) return quiz.pointsLevel2;
    if (difficulty === 3) return quiz.pointsLevel3;
    if (difficulty === 4) return quiz.pointsLevel4;
    return quiz.pointsLevel5;
  };

  const hasSubmittedRef = useRef(false);

  const startGame = () => {
    hasSubmittedRef.current = false;
    setGameState('playing');
    setCurrentContentIndex(0);
    setCurrentScreenshotIndex(0);
    setResults([]);
    gameStartedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setSearchQuery('');
  };

  const finishQuiz = () => {
    const gameStartedAt = gameStartedAtRef.current;
    setElapsedSeconds(gameStartedAt === null ? 0 : Math.round((Date.now() - gameStartedAt) / 1000));
    setGameState('finished');
  };

  useEffect(() => {
    if (gameState !== 'finished' || hasSubmittedRef.current) return;
    if (!user || results.length === 0) return;

    hasSubmittedRef.current = true;
    const answers = results.map((r) => ({
      screenshotId: contentItems.find((c) => c.contentId === r.contentId)?.screenshots[0]?.id || 0,
      selectedContentId: r.wasCorrect ? r.contentId : '',
      timeTaken: 0,
    }));

    submitQuiz({
      variables: { input: { contentTypeId, answers, totalTimeTaken: elapsedSeconds } },
    });
  }, [gameState, results, user, contentItems, contentTypeId, submitQuiz, elapsedSeconds]);

  const moveToNextScreenshot = () => {
    if (currentScreenshotIndex < totalScreenshots - 1) {
      setCurrentScreenshotIndex(currentScreenshotIndex + 1);
    } else {
      setGameState('revealed');
    }
  };

  const handleAnswer = (selectedContentId: string) => {
    if (gameState !== 'playing' || isWrongAnswer) return;

    const isCorrect = selectedContentId === currentContent?.contentId;
    setSearchQuery('');

    if (isCorrect) {
      const points = calculatePoints(currentScreenshot?.difficulty || 1);
      setResults((prev) => [
        ...prev,
        {
          contentId: currentContent.contentId,
          wasCorrect: true,
          screenshotsUsed: currentScreenshotIndex + 1,
          pointsEarned: points,
        },
      ]);
      toast.success(t('pointsAdded', { points }));
      setGameState('revealed-correct');
    } else {
      toast.error(t('wrong'));
      setIsWrongAnswer(true);
      setTimeout(() => {
        setIsWrongAnswer(false);
        moveToNextScreenshot();
      }, 1200);
    }
  };

  const handlePass = () => {
    if (gameState !== 'playing' || isWrongAnswer) return;
    setSearchQuery('');
    moveToNextScreenshot();
  };

  const continueAfterReveal = () => {
    setResults((prev) => [
      ...prev,
      {
        contentId: currentContent?.contentId || '',
        wasCorrect: false,
        screenshotsUsed: totalScreenshots,
        pointsEarned: 0,
      },
    ]);

    if (currentContentIndex < contentItems.length - 1) {
      setCurrentContentIndex(currentContentIndex + 1);
      setCurrentScreenshotIndex(0);
      setGameState('playing');
    } else {
      finishQuiz();
    }
  };

  const continueAfterCorrectReveal = () => {
    if (currentContentIndex < contentItems.length - 1) {
      setCurrentContentIndex(currentContentIndex + 1);
      setCurrentScreenshotIndex(0);
      setGameState('playing');
    } else {
      finishQuiz();
    }
  };

  const getContentDetails = (content: ContentItem | undefined) => {
    if (!content) return { directors: [] as QuizPerson[], actors: [] as QuizPerson[] };

    const persons = content.persons || [];
    const directors = persons
      .filter((p) => {
        const role = (p.role || '').toLowerCase();
        const job = (p.job || '').toLowerCase();
        return role === 'director' || job === 'director';
      })
      .slice(0, 3);

    const actors = persons
      .filter((p) => {
        const role = (p.role || '').toLowerCase();
        const job = (p.job || '').toLowerCase();
        const NON_CAST = [
          'director',
          'writer',
          'author',
          'producer',
          'composer',
          'editor',
          'cinematographer',
        ];
        return !NON_CAST.some((r) => role === r || job.includes(r));
      })
      .slice(0, 6);

    return { directors, actors };
  };

  const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const correctCount = results.filter((r) => r.wasCorrect).length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  return {
    gameState: resolvedGameState,
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
  };
}
