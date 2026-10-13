/**
 * Array utility functions for drag-drop reordering and credit order management
 */

/**
 * Reorders an array by moving an element from one index to another.
 * Returns a new array without mutating the original.
 *
 * @param array - The source array
 * @param fromIndex - The index of the element to move
 * @param toIndex - The target index where the element should be placed
 * @returns A new reordered array
 */
export function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  // Return original array if indices are invalid or same
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= array.length ||
    toIndex >= array.length
  ) {
    return [...array];
  }

  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

/**
 * Person type for cast/crew members with optional creditOrder
 */
interface PersonWithCreditOrder {
  id?: number;
  name: string;
  creditOrder?: number;
  [key: string]: unknown;
}

/**
 * Assigns creditOrder values to each element based on their array index.
 * Returns a new array without mutating the original.
 *
 * @param cast - Array of person objects
 * @returns A new array with creditOrder assigned as zero-based index
 */
export function assignCreditOrder<T extends PersonWithCreditOrder>(cast: T[]): T[] {
  return cast.map((person, index) => ({
    ...person,
    creditOrder: index,
  }));
}

/**
 * Sorts an array of persons by their creditOrder value in ascending order.
 * Handles null/undefined creditOrder by placing them at the end.
 * For equal creditOrder values, maintains stable sort by using array index.
 *
 * @param cast - Array of person objects with optional creditOrder
 * @returns A new sorted array
 */
export function sortByCreditOrder<T extends PersonWithCreditOrder>(cast: T[]): T[] {
  return [...cast].sort((a, b) => {
    const orderA = a.creditOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.creditOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
}
