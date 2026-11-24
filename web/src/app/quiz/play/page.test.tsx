import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SEARCH_CONTENT, START_QUIZ_V2 } from '../hooks/useQuizGame';
import QuizPlayPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));

beforeEach(() => {
  window.history.replaceState(null, '', '/quiz/play/');
});

it('asks a guest to sign in on the daily quiz link', () => {
  window.history.replaceState(null, '', '/quiz/play/?daily=1');
  render(<MockedProvider><QuizPlayPage /></MockedProvider>);
  expect(screen.getByRole('link', { name: 'dailyLogin' })).toHaveAttribute('href', '/auth/login');
});

it('only accepts Enter for the current answer search and focuses the continue button', async () => {
  const practice = {
    request: { query: START_QUIZ_V2, variables: { contentTypeId: 1, questionCount: 1, consumedOnly: false } },
    result: {
      data: {
        startQuizV2: {
          __typename: 'QuizSessionV2',
          dailyDate: null,
          dailyCompleted: null,
          contentTypeId: 1,
          contentTypeName: 'Film',
          pointsLevel1: 10,
          pointsLevel2: 15,
          pointsLevel3: 20,
          pointsLevel4: 25,
          pointsLevel5: 30,
          contentItems: [{
            contentId: 'right',
            title: 'Right title',
            posterUrl: null,
            description: null,
            releaseDate: null,
            runtime: null,
            authors: null,
            persons: [],
            screenshots: [{ id: 42, imageUrl: '/uploads/screenshots/42.png', difficulty: 1 }],
          }],
        },
      },
    },
  };
  const search = (searchQuery: string, id: string, title: string, delay: number) => ({
    request: { query: SEARCH_CONTENT, variables: { searchQuery, contentTypeId: 1, limit: 10 } },
    result: { data: { searchContent: { items: [{ id, title, posterUrl: null }] } } },
    delay,
  });
  render(
    <MockedProvider mocks={[
      practice,
      search('first', 'wrong', 'First result', 0),
      search('second', 'right', 'Right title', 150),
    ]}>
      <QuizPlayPage />
    </MockedProvider>
  );
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  const input = await screen.findByRole('textbox', { name: 'searchPlaceholder' });
  fireEvent.change(input, { target: { value: 'first' } });
  await screen.findByRole('button', { name: 'First result' });

  fireEvent.change(input, { target: { value: 'second' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'First result' })).toBeNull();
  await screen.findByRole('button', { name: 'Right title' });

  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'showResults' })).toHaveFocus();
  expect(input).toBeDisabled();
});
