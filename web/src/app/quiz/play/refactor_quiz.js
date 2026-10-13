const fs = require('fs');
const path = 'web/src/app/quiz/play/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const startQuizQueryStart = lines.findIndex(l => l.includes('const START_QUIZ_V2 = gql`'));
const innerFuncStart = lines.findIndex(l => l.includes('function QuizPlayPageInner() {'));

const calculatePointsStart = lines.findIndex(l => l.includes('const calculatePoints = '));
const getContentTypePathEnd = lines.findIndex(l => l.includes('// Hesaplamalar')) - 1; 

const stateStart = lines.findIndex(l => l.includes('const [gameState, setGameState] = useState'));
const totalScoreLine = lines.findIndex(l => l.includes('const totalScore = results.reduce('));

const beforeHooks = lines.slice(0, stateStart).join('\n');
const afterHooks = lines.slice(totalScoreLine + 3).join('\n'); // skips accuracy too

const newHooks = `
  const {
    gameState,
    setGameState,
    currentContentIndex,
    currentScreenshotIndex,
    results,
    totalStartTime,
    isWrongAnswer,
    searchQuery,
    setSearchQuery,
    showSearchResults,
    setShowSearchResults,
    selectedResultIndex,
    setSelectedResultIndex,
    quiz,
    contentItems,
    currentContent,
    currentScreenshot,
    totalScreenshots,
    searchData,
    loading,
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
    getContentDetails
  } = useQuizGame(contentTypeId, t);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for search results
  const searchItems = searchData?.searchContent?.items || [];
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
    [showSearchResults, searchItems, selectedResultIndex, handleAnswer]
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
      case 1: return 'movie';
      case 2: return 'tv';
      case 3: return 'game';
      case 4: return 'book';
      default: return 'movie';
    }
  };
`;

let finalContent = beforeHooks + '\n' + newHooks + '\n' + afterHooks;

const importEnd = finalContent.indexOf('const START_QUIZ_V2');
const functionStart = finalContent.indexOf('export default function QuizPlayPage()');

const topImports = finalContent.substring(0, importEnd);
const functionBody = finalContent.substring(functionStart);

finalContent = topImports + '\nimport { useQuizGame } from \'../hooks/useQuizGame\';\n\n' + functionBody;

fs.writeFileSync(path, finalContent);
console.log('Successfully refactored QuizPlayPageInner.');
