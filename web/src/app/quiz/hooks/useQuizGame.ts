import { useState, useEffect, useRef, useCallback } from 'react';
import { skipToken, useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const QUIZ_FIELDS = gql`
  fragment QuizFields on QuizSessionV2 {
      dailyDate
      dailyCompleted
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
`;

export const START_QUIZ_V2 = gql`
  query StartQuizV2($contentTypeId: Int!, $questionCount: Int, $consumedOnly: Boolean!) {
    startQuizV2(contentTypeId: $contentTypeId, questionCount: $questionCount, consumedOnly: $consumedOnly) { ...QuizFields }
  }
  ${QUIZ_FIELDS}
`;
const DAILY_QUIZ = gql`
  query DailyQuiz { dailyQuiz { ...QuizFields } }
  ${QUIZ_FIELDS}
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

interface QuizSession {
  dailyDate?: string | null;
  dailyCompleted?: boolean | null;
  contentItems: ContentItem[];
  pointsLevel1: number;
  pointsLevel2: number;
  pointsLevel3: number;
  pointsLevel4: number;
  pointsLevel5: number;
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
  | 'ready'
  | 'playing'
  | 'revealed'
  | 'revealed-correct'
  | 'finished';

export function useQuizGame(contentTypeId: number, t: any, dailyMode = false) {
  const { user, loading: authLoading } = useAuth();

  const [gameState, setGameState] = useState<GameState>('ready');
  const [practiceQuiz, setPracticeQuiz] = useState<QuizSession>();
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0);
  const [results, setResults] = useState<ContentResult[]>([]);
  const gameStartedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWrongAnswer, setIsWrongAnswer] = useState(false);
  const wrongAnswerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQueryState] = useState('');
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const trimmedSearch = searchQuery.trim();
  const showSearchResults = gameState === 'playing' && trimmedSearch.length >= 2;
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setSelectedResultIndex(query.trim().length >= 2 ? 0 : -1);
  }, []);

  const { data, loading, error, refetch } = useQuery<{ dailyQuiz: QuizSession }>(
    DAILY_QUIZ,
    dailyMode && !authLoading && user ? { fetchPolicy: 'no-cache' } : skipToken
  );
  const [loadPractice, { loading: practiceLoading }] = useLazyQuery<{ startQuizV2: QuizSession }>(
    START_QUIZ_V2,
    { fetchPolicy: 'no-cache' }
  );

  const { data: searchData, loading: searchLoading, error: searchError } =
    useQuery<SearchContentResponse>(
      SEARCH_CONTENT,
      showSearchResults
        ? { variables: { searchQuery: trimmedSearch, contentTypeId, limit: 10 } }
        : skipToken
    );

  const [submitQuiz] = useMutation<any, any>(SUBMIT_QUIZ, {
    onCompleted: (data: any) => console.log('[QuizPlay] Quiz submitted:', data.submitQuiz),
    onError: (err: any) => {
      console.error('[QuizPlay] Error submitting quiz:', err);
      toast.error(t('resultsNotSaved'));
    },
  });

  const quiz = dailyMode ? data?.dailyQuiz : practiceQuiz;
  const contentItems: ContentItem[] = quiz?.contentItems ?? EMPTY_CONTENT_ITEMS;
  const currentContent = contentItems[currentContentIndex];
  const currentScreenshot = currentContent?.screenshots[currentScreenshotIndex];
  const totalScreenshots = currentContent?.screenshots.length || 0;

  useEffect(() => {
    return () => {
      if (wrongAnswerTimer.current !== null) clearTimeout(wrongAnswerTimer.current);
    };
  }, []);

  const calculatePoints = (difficulty: number): number => {
    if (!quiz) return 0;
    if (difficulty <= 1) return quiz.pointsLevel1;
    if (difficulty === 2) return quiz.pointsLevel2;
    if (difficulty === 3) return quiz.pointsLevel3;
    if (difficulty === 4) return quiz.pointsLevel4;
    return quiz.pointsLevel5;
  };

  const hasSubmittedRef = useRef(false);
  const startingRef = useRef(false);

  const startGame = async (questionCount: number, consumedOnly: boolean) => {
    if (startingRef.current) return;
    if (dailyMode) {
      if (!user || !quiz?.contentItems.length || quiz.dailyCompleted) return;
    } else {
      startingRef.current = true;
      try {
        const { data } = await loadPractice({
          variables: { contentTypeId, questionCount, consumedOnly },
        });
        const nextQuiz = data?.startQuizV2;
        if (!nextQuiz?.contentItems.length) {
          toast.error(t('noMatchingContent'));
          return;
        }
        if (nextQuiz.contentItems.length < questionCount) {
          toast(t('fewerQuestions', { count: nextQuiz.contentItems.length }));
        }
        setPracticeQuiz(nextQuiz);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('quizNotLoaded'));
        return;
      } finally {
        startingRef.current = false;
      }
    }
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
    if (!dailyMode || !user || !quiz?.dailyDate || results.length === 0) return;

    hasSubmittedRef.current = true;
    const answers = results.map((r) => ({
      screenshotId: contentItems.find((c) => c.contentId === r.contentId)?.screenshots[r.screenshotsUsed - 1]?.id || 0,
      selectedContentId: r.wasCorrect ? r.contentId : '',
      timeTaken: 0,
    }));

    submitQuiz({
      variables: { input: { contentTypeId, dailyDate: quiz.dailyDate, answers, totalTimeTaken: elapsedSeconds } },
    });
  }, [gameState, results, user, contentItems, contentTypeId, submitQuiz, elapsedSeconds, dailyMode, quiz]);

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
      wrongAnswerTimer.current = setTimeout(() => {
        wrongAnswerTimer.current = null;
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

  const handleGiveUp = () => {
    if (gameState !== 'playing' || isWrongAnswer) return;
    setSearchQuery('');
    setGameState('revealed');
  };

  const continueAfterReveal = () => {
    setResults((prev) => [
      ...prev,
      {
        contentId: currentContent?.contentId || '',
        wasCorrect: false,
        screenshotsUsed: currentScreenshotIndex + 1,
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
    user,
    authLoading,
    contentItems,
    currentContent,
    currentScreenshot,
    totalScreenshots,
    searchData,
    loading,
    searchLoading,
    searchError,
    practiceLoading,
    error,
    refetch,
    totalScore,
    correctCount,
    accuracy,
    startGame,
    handleAnswer,
    handlePass,
    handleGiveUp,
    continueAfterReveal,
    continueAfterCorrectReveal,
    getContentDetails,
  };
}
