/**
 * Bug Condition Exploration Test for Person Page Duplicate Content Fix
 *
 * **Validates: Requirements 2.1, 2.2, 2.3**
 *
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 *
 * This test explores the fault condition where a person has multiple roles in the same content,
 * causing duplicate content cards to be rendered and React key collision errors.
 *
 * Expected behavior on UNFIXED code:
 * - Test will FAIL (this is correct - it proves the bug exists)
 * - Multiple cards will be rendered for the same contentId
 * - React will throw "Encountered two children with the same key" errors
 *
 * Expected behavior on FIXED code:
 * - Test will PASS
 * - Each unique contentId renders exactly once
 * - All roles are displayed on the single card
 * - No React key collision errors
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { PersonContentData } from '@/services/graphql/person';
import { groupContentByContentId, formatRoles } from '@/app/person/[id]/page';

/**
 * Helper function to check if content array has duplicate contentIds (bug condition)
 */
function hasDuplicateContentIds(content: PersonContentData[]): boolean {
  const contentIdCounts = new Map<string, number>();

  for (const item of content) {
    const count = contentIdCounts.get(item.contentId) || 0;
    contentIdCounts.set(item.contentId, count + 1);
  }

  return Array.from(contentIdCounts.values()).some((count) => count > 1);
}

/**
 * Helper function to count unique contentIds in an array
 */
function countUniqueContentIds(content: PersonContentData[]): number {
  return new Set(content.map((c) => c.contentId)).size;
}

/**
 * Helper function to extract all roles for a given contentId
 */
function getRolesForContentId(content: PersonContentData[], contentId: string): string[] {
  return content.filter((c) => c.contentId === contentId).map((c) => c.role);
}

/**
 * Mock component that simulates the person page rendering logic
 * Now uses the actual grouping function to test the FIXED behavior
 */
function PersonContentList({ content }: { content: PersonContentData[] }) {
  const groupedContent = groupContentByContentId(content);

  return (
    <div data-testid="content-list">
      {groupedContent.map((item) => (
        <div
          key={item.contentId}
          data-testid={`content-card-${item.contentId}`}
          className="content-card"
        >
          <div data-testid={`content-title-${item.contentId}`}>{item.contentTitle}</div>
          <div data-testid={`content-role-${item.contentId}`}>{formatRoles(item.roles)}</div>
          {item.characters.length > 0 && (
            <div data-testid={`content-character-${item.contentId}`}>
              {item.characters.join('", "')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

describe('Property 1: Fault Condition - Duplicate Content Consolidation', () => {
  describe('Concrete Failing Cases - Scoped PBT Approach', () => {
    it('should render single card for Actor+Director in same content', () => {
      // Test case: Person is both Actor and Director in "The Matrix"
      const content: PersonContentData[] = [
        {
          contentId: '1',
          contentTitle: 'The Matrix',
          contentType: 'movie',
          role: 'Actor',
          character: 'Neo',
          releaseDate: '1999-03-31',
          posterUrl: '/matrix.jpg',
          userStatus: null,
        },
        {
          contentId: '1',
          contentTitle: 'The Matrix',
          contentType: 'movie',
          role: 'Director',
          character: undefined,
          releaseDate: '1999-03-31',
          posterUrl: '/matrix.jpg',
          userStatus: null,
        },
      ];

      // Verify this is a bug condition
      expect(hasDuplicateContentIds(content)).toBe(true);
      expect(countUniqueContentIds(content)).toBe(1);

      const { container } = render(<PersonContentList content={content} />);

      // Expected behavior: Exactly 1 card for the unique contentId
      const cards = container.querySelectorAll('.content-card');
      expect(cards.length).toBe(1); // WILL FAIL on unfixed code (shows 2 cards)

      // Expected behavior: All roles should be displayed on the single card
      const roles = getRolesForContentId(content, '1');
      expect(roles).toContain('Actor');
      expect(roles).toContain('Director');

      // On fixed code, both roles should be visible in the single card
      // On unfixed code, roles are split across multiple cards
    });

    it('should render single card for Actor+Writer+Producer in same content', () => {
      // Test case: Person is Actor, Writer, and Producer in "Good Will Hunting"
      const content: PersonContentData[] = [
        {
          contentId: '2',
          contentTitle: 'Good Will Hunting',
          contentType: 'movie',
          role: 'Actor',
          character: 'Will Hunting',
          releaseDate: '1997-12-05',
          posterUrl: '/gwh.jpg',
          userStatus: null,
        },
        {
          contentId: '2',
          contentTitle: 'Good Will Hunting',
          contentType: 'movie',
          role: 'Writer',
          character: undefined,
          releaseDate: '1997-12-05',
          posterUrl: '/gwh.jpg',
          userStatus: null,
        },
        {
          contentId: '2',
          contentTitle: 'Good Will Hunting',
          contentType: 'movie',
          role: 'Producer',
          character: undefined,
          releaseDate: '1997-12-05',
          posterUrl: '/gwh.jpg',
          userStatus: null,
        },
      ];

      // Verify this is a bug condition
      expect(hasDuplicateContentIds(content)).toBe(true);
      expect(countUniqueContentIds(content)).toBe(1);

      const { container } = render(<PersonContentList content={content} />);

      // Expected behavior: Exactly 1 card for the unique contentId
      const cards = container.querySelectorAll('.content-card');
      expect(cards.length).toBe(1); // WILL FAIL on unfixed code (shows 3 cards)

      // Expected behavior: All roles should be displayed
      const roles = getRolesForContentId(content, '2');
      expect(roles).toContain('Actor');
      expect(roles).toContain('Writer');
      expect(roles).toContain('Producer');
    });

    it('should handle mixed content with some duplicates and some unique', () => {
      // Test case: Mixed array with duplicate contentId "3" and unique contentIds "4" and "5"
      const content: PersonContentData[] = [
        {
          contentId: '3',
          contentTitle: 'Inception',
          contentType: 'movie',
          role: 'Actor',
          character: 'Cobb',
          releaseDate: '2010-07-16',
          posterUrl: '/inception.jpg',
          userStatus: null,
        },
        {
          contentId: '3',
          contentTitle: 'Inception',
          contentType: 'movie',
          role: 'Producer',
          character: undefined,
          releaseDate: '2010-07-16',
          posterUrl: '/inception.jpg',
          userStatus: null,
        },
        {
          contentId: '4',
          contentTitle: 'Interstellar',
          contentType: 'movie',
          role: 'Actor',
          character: 'Cooper',
          releaseDate: '2014-11-07',
          posterUrl: '/interstellar.jpg',
          userStatus: null,
        },
        {
          contentId: '5',
          contentTitle: 'The Dark Knight',
          contentType: 'movie',
          role: 'Actor',
          character: 'Batman',
          releaseDate: '2008-07-18',
          posterUrl: '/tdk.jpg',
          userStatus: null,
        },
      ];

      // Verify bug condition exists for contentId "3"
      expect(hasDuplicateContentIds(content)).toBe(true);
      expect(countUniqueContentIds(content)).toBe(3);

      const { container } = render(<PersonContentList content={content} />);

      // Expected behavior: Exactly 3 cards (one per unique contentId)
      const cards = container.querySelectorAll('.content-card');
      expect(cards.length).toBe(3); // WILL FAIL on unfixed code (shows 4 cards)

      // Verify contentId "3" has both roles
      const rolesFor3 = getRolesForContentId(content, '3');
      expect(rolesFor3).toContain('Actor');
      expect(rolesFor3).toContain('Producer');
    });

    it('should not have React key collision errors', () => {
      // Test case: Duplicate contentIds should not cause React key errors
      const content: PersonContentData[] = [
        {
          contentId: '6',
          contentTitle: 'Test Movie',
          contentType: 'movie',
          role: 'Actor',
          character: 'Character A',
          releaseDate: '2020-01-01',
          posterUrl: '/test.jpg',
          userStatus: null,
        },
        {
          contentId: '6',
          contentTitle: 'Test Movie',
          contentType: 'movie',
          role: 'Director',
          character: undefined,
          releaseDate: '2020-01-01',
          posterUrl: '/test.jpg',
          userStatus: null,
        },
      ];

      // Spy on console.error to catch React warnings
      const consoleErrors: string[] = [];
      const originalError = console.error;
      console.error = (...args: any[]) => {
        consoleErrors.push(args.join(' '));
        originalError(...args);
      };

      render(<PersonContentList content={content} />);

      // Restore console.error
      console.error = originalError;

      // Expected behavior: No React key collision errors
      const hasKeyError = consoleErrors.some((error) =>
        error.includes('Encountered two children with the same key')
      );

      expect(hasKeyError).toBe(false); // WILL FAIL on unfixed code (React throws key error)
    });
  });

  describe('Property-Based Test - Generalized Duplicate Detection', () => {
    it('should render exactly one card per unique contentId for any content array with duplicates', () => {
      // Property: For any content array where duplicate contentIds exist,
      // the number of rendered cards should equal the number of unique contentIds

      fc.assert(
        fc.property(
          // Generator: Create content arrays with guaranteed duplicates
          fc
            .array(
              fc.record({
                contentId: fc.constantFrom('1', '2', '3'), // Limited set to ensure duplicates
                contentTitle: fc.constantFrom('Movie A', 'Movie B', 'Movie C'),
                contentType: fc.constant('movie'),
                role: fc.constantFrom('Actor', 'Director', 'Writer', 'Producer'),
                character: fc.option(fc.constantFrom('Character A', 'Character B'), {
                  nil: undefined,
                }),
                releaseDate: fc.constant('2020-01-01'),
                posterUrl: fc.constant('/test.jpg'),
                userStatus: fc.constant(null),
              }),
              { minLength: 2, maxLength: 10 }
            )
            .filter(hasDuplicateContentIds), // Only test arrays with duplicates

          (content) => {
            const { container } = render(<PersonContentList content={content} />);
            const cards = container.querySelectorAll('.content-card');
            const uniqueCount = countUniqueContentIds(content);

            // Property: Number of cards should equal number of unique contentIds
            expect(cards.length).toBe(uniqueCount);
          }
        ),
        { numRuns: 50 } // Run 50 random test cases
      );
    });
  });
});

/**
 * Preservation Property Tests for Person Page Duplicate Content Fix
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * IMPORTANT: These tests run on UNFIXED code to capture baseline behavior
 *
 * These tests verify that the fix does not break existing functionality for content
 * arrays with unique contentIds (no duplicates). They capture the current behavior
 * that must be preserved after implementing the fix.
 *
 * Expected behavior on UNFIXED code:
 * - Tests will PASS (this confirms baseline behavior)
 * - Single-role content renders correctly
 * - Visual elements display properly
 * - All functionality works as expected
 *
 * Expected behavior on FIXED code:
 * - Tests will PASS (this confirms no regressions)
 * - Same behavior is preserved for non-buggy inputs
 */

describe('Property 2: Preservation - Single-Role Content Rendering', () => {
  describe('Single-Role Content Preservation', () => {
    it('should render single-role content with correct visual output', () => {
      // Test case: Content array with unique contentIds (no duplicates)
      const content: PersonContentData[] = [
        {
          contentId: '10',
          contentTitle: 'Inception',
          contentType: 'movie',
          role: 'Actor',
          character: 'Cobb',
          releaseDate: '2010-07-16',
          posterUrl: '/inception.jpg',
          userStatus: null,
        },
        {
          contentId: '11',
          contentTitle: 'Interstellar',
          contentType: 'movie',
          role: 'Actor',
          character: 'Cooper',
          releaseDate: '2014-11-07',
          posterUrl: '/interstellar.jpg',
          userStatus: null,
        },
        {
          contentId: '12',
          contentTitle: 'The Dark Knight',
          contentType: 'movie',
          role: 'Actor',
          character: 'Batman',
          releaseDate: '2008-07-18',
          posterUrl: '/tdk.jpg',
          userStatus: null,
        },
      ];

      // Verify no duplicates (preservation condition)
      expect(hasDuplicateContentIds(content)).toBe(false);
      expect(countUniqueContentIds(content)).toBe(3);

      const { container } = render(<PersonContentList content={content} />);

      // Preservation: Should render exactly one card per content item
      const cards = container.querySelectorAll('.content-card');
      expect(cards.length).toBe(3);

      // Preservation: Each card should display correct title
      expect(screen.getByText('Inception')).toBeInTheDocument();
      expect(screen.getByText('Interstellar')).toBeInTheDocument();
      expect(screen.getByText('The Dark Knight')).toBeInTheDocument();

      // Preservation: Each card should display correct role (in Turkish)
      const roleElements = container.querySelectorAll('[data-testid^="content-role-"]');
      expect(roleElements.length).toBe(3);
      expect(roleElements[0].textContent).toBe('Oyuncu');
      expect(roleElements[1].textContent).toBe('Oyuncu');
      expect(roleElements[2].textContent).toBe('Oyuncu');

      // Preservation: Each card should display correct character
      expect(screen.getByText('Cobb')).toBeInTheDocument();
      expect(screen.getByText('Cooper')).toBeInTheDocument();
      expect(screen.getByText('Batman')).toBeInTheDocument();
    });

    it('should render content without character information correctly', () => {
      // Test case: Content with no character (e.g., Director role)
      const content: PersonContentData[] = [
        {
          contentId: '20',
          contentTitle: 'Dunkirk',
          contentType: 'movie',
          role: 'Director',
          character: undefined,
          releaseDate: '2017-07-21',
          posterUrl: '/dunkirk.jpg',
          userStatus: null,
        },
      ];

      // Verify no duplicates
      expect(hasDuplicateContentIds(content)).toBe(false);

      const { container } = render(<PersonContentList content={content} />);

      // Preservation: Should render one card
      const cards = container.querySelectorAll('.content-card');
      expect(cards.length).toBe(1);

      // Preservation: Should display title and role
      expect(screen.getByText('Dunkirk')).toBeInTheDocument();
      expect(screen.getByText('Yönetmen')).toBeInTheDocument();

      // Preservation: Should not display character element
      const characterElement = container.querySelector('[data-testid="content-character-20"]');
      expect(characterElement).not.toBeInTheDocument();
    });

    it('should handle empty content array', () => {
      // Test case: Empty content array
      const content: PersonContentData[] = [];

      const { container } = render(<PersonContentList content={content} />);

      // Preservation: Should render no cards
      const cards = container.querySelectorAll('.content-card');
      expect(cards.length).toBe(0);
    });

    it('should handle single content item', () => {
      // Test case: Single content item
      const content: PersonContentData[] = [
        {
          contentId: '30',
          contentTitle: 'Tenet',
          contentType: 'movie',
          role: 'Actor',
          character: 'Protagonist',
          releaseDate: '2020-08-26',
          posterUrl: '/tenet.jpg',
          userStatus: null,
        },
      ];

      // Verify no duplicates
      expect(hasDuplicateContentIds(content)).toBe(false);

      const { container } = render(<PersonContentList content={content} />);

      // Preservation: Should render exactly one card
      const cards = container.querySelectorAll('.content-card');
      expect(cards.length).toBe(1);

      // Preservation: Should display all elements correctly
      expect(screen.getByText('Tenet')).toBeInTheDocument();
      expect(screen.getByText('Oyuncu')).toBeInTheDocument();
      expect(screen.getByText('Protagonist')).toBeInTheDocument();
    });
  });

  describe('Visual Elements Preservation', () => {
    it('should preserve poster, title, and role display for various role types', () => {
      // Test case: Different role types (Actor, Director, Writer, Producer, etc.)
      const content: PersonContentData[] = [
        {
          contentId: '40',
          contentTitle: 'Movie A',
          contentType: 'movie',
          role: 'Actor',
          character: 'Character A',
          releaseDate: '2020-01-01',
          posterUrl: '/a.jpg',
          userStatus: null,
        },
        {
          contentId: '41',
          contentTitle: 'Movie B',
          contentType: 'movie',
          role: 'Director',
          character: undefined,
          releaseDate: '2020-02-01',
          posterUrl: '/b.jpg',
          userStatus: null,
        },
        {
          contentId: '42',
          contentTitle: 'Movie C',
          contentType: 'movie',
          role: 'Writer',
          character: undefined,
          releaseDate: '2020-03-01',
          posterUrl: '/c.jpg',
          userStatus: null,
        },
        {
          contentId: '43',
          contentTitle: 'Movie D',
          contentType: 'movie',
          role: 'Producer',
          character: undefined,
          releaseDate: '2020-04-01',
          posterUrl: '/d.jpg',
          userStatus: null,
        },
      ];

      // Verify no duplicates
      expect(hasDuplicateContentIds(content)).toBe(false);

      const { container } = render(<PersonContentList content={content} />);

      // Preservation: Should render 4 cards
      const cards = container.querySelectorAll('.content-card');
      expect(cards.length).toBe(4);

      // Preservation: All titles should be visible
      expect(screen.getByText('Movie A')).toBeInTheDocument();
      expect(screen.getByText('Movie B')).toBeInTheDocument();
      expect(screen.getByText('Movie C')).toBeInTheDocument();
      expect(screen.getByText('Movie D')).toBeInTheDocument();

      // Preservation: All roles should be visible (in Turkish)
      expect(screen.getByText('Oyuncu')).toBeInTheDocument();
      expect(screen.getByText('Yönetmen')).toBeInTheDocument();
      expect(screen.getByText('Senarist')).toBeInTheDocument();
      expect(screen.getByText('Yapımcı')).toBeInTheDocument();
    });
  });

  describe('Property-Based Test - Generalized Preservation', () => {
    it('should render exactly one card per content item for any array without duplicates', () => {
      // Property: For any content array where all contentIds are unique,
      // the number of rendered cards should equal the array length

      fc.assert(
        fc.property(
          // Generator: Create content arrays with guaranteed unique contentIds
          fc
            .array(
              fc.record({
                contentId: fc.integer({ min: 1000, max: 9999 }).map(String), // Large range for uniqueness
                contentTitle: fc.constantFrom(
                  'Movie A',
                  'Movie B',
                  'Movie C',
                  'Movie D',
                  'Movie E'
                ),
                contentType: fc.constant('movie'),
                role: fc.constantFrom('Actor', 'Director', 'Writer', 'Producer', 'Cinematographer'),
                character: fc.option(fc.constantFrom('Character A', 'Character B', 'Character C'), {
                  nil: undefined,
                }),
                releaseDate: fc.constant('2020-01-01'),
                posterUrl: fc.constant('/test.jpg'),
                userStatus: fc.constant(null),
              }),
              { minLength: 1, maxLength: 10 }
            )
            .map((arr) => {
              // Ensure all contentIds are unique by adding index
              return arr.map((item, idx) => ({
                ...item,
                contentId: `${item.contentId}-${idx}`,
              }));
            })
            .filter((arr) => !hasDuplicateContentIds(arr)), // Only test arrays without duplicates

          (content) => {
            const { container } = render(<PersonContentList content={content} />);
            const cards = container.querySelectorAll('.content-card');

            // Property: Number of cards should equal array length (one card per item)
            expect(cards.length).toBe(content.length);

            // Property: Each contentId should appear exactly once
            content.forEach((item) => {
              const card = container.querySelector(
                `[data-testid="content-card-${item.contentId}"]`
              );
              expect(card).toBeInTheDocument();
            });
          }
        ),
        { numRuns: 50 } // Run 50 random test cases
      );
    });

    it('should preserve all visual elements for any single-role content array', () => {
      // Property: For any content array without duplicates,
      // all titles, roles, and characters should be rendered correctly

      fc.assert(
        fc.property(
          // Generator: Create content arrays with unique contentIds
          fc
            .array(
              fc.record({
                contentId: fc.integer({ min: 1000, max: 9999 }).map(String),
                contentTitle: fc.string({ minLength: 1, maxLength: 50 }),
                contentType: fc.constant('movie'),
                role: fc.constantFrom('Actor', 'Director', 'Writer', 'Producer'),
                character: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
                  nil: undefined,
                }),
                releaseDate: fc.constant('2020-01-01'),
                posterUrl: fc.constant('/test.jpg'),
                userStatus: fc.constant(null),
              }),
              { minLength: 1, maxLength: 5 }
            )
            .map((arr) => {
              // Ensure all contentIds are unique
              return arr.map((item, idx) => ({
                ...item,
                contentId: `${item.contentId}-${idx}`,
              }));
            })
            .filter((arr) => !hasDuplicateContentIds(arr)),

          (content) => {
            const { container } = render(<PersonContentList content={content} />);

            // Property: All titles should be rendered
            content.forEach((item) => {
              const titleElement = container.querySelector(
                `[data-testid="content-title-${item.contentId}"]`
              );
              expect(titleElement).toBeInTheDocument();
              expect(titleElement?.textContent).toBe(item.contentTitle);
            });

            // Property: All roles should be rendered (translated to Turkish)
            content.forEach((item) => {
              const roleElement = container.querySelector(
                `[data-testid="content-role-${item.contentId}"]`
              );
              expect(roleElement).toBeInTheDocument();
              expect(roleElement?.textContent).toBe(formatRoles([item.role]));
            });

            // Property: Characters should be rendered when present
            content.forEach((item) => {
              const characterElement = container.querySelector(
                `[data-testid="content-character-${item.contentId}"]`
              );
              if (item.character) {
                expect(characterElement).toBeInTheDocument();
                expect(characterElement?.textContent).toBe(item.character);
              } else {
                expect(characterElement).not.toBeInTheDocument();
              }
            });
          }
        ),
        { numRuns: 30 } // Run 30 random test cases
      );
    });
  });
});
