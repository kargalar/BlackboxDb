import { QuizOption } from "../../types/Quiz";

// ======================================
// Quiz Helper Functions
// ======================================

/**
 * Randomly selects a specified number of items from an array.
 */
export function selectRandomQuestions<T>(array: T[], count: number): T[] {
  console.log(
    `🎲 [QuizHelper] selectRandomQuestions: selecting ${count} from ${array.length} items`,
  );
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generates wrong quiz options by filtering out the correct answer
 * and randomly selecting from the remaining contents.
 */
export function getRandomWrongOptions(
  allContents: { id: string; title: string; posterUrl: string | null }[],
  correctId: string,
  count: number,
): QuizOption[] {
  console.log(
    `🎲 [QuizHelper] getRandomWrongOptions: generating ${count} wrong options (correctId: ${correctId})`,
  );
  const filtered = allContents.filter((c) => c.id !== correctId);
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((c) => ({
    contentId: c.id,
    title: c.title,
    posterUrl: c.posterUrl || undefined,
  }));
}

/**
 * Fisher-Yates shuffle algorithm for randomizing array order.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  console.log(
    `🎲 [QuizHelper] shuffleArray: shuffled ${newArray.length} items`,
  );
  return newArray;
}
