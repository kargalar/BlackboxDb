import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { Pagination } from './Pagination';
import { resetGuestGridPrefsForTest, useUserPreferences } from '@/hooks/useUserPreferences';
import { UPDATE_PREFERENCES } from '@/services/graphql/auth';

const mockMutate = vi.fn();
const mockToastError = vi.fn();
const mockAuthState = vi.hoisted(() => ({
  user: null as { id: string; gridColumns?: number; gridRows?: number } | null,
  updateUserPreferences: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('@/lib/apollo-client', () => ({
  apolloClient: {
    mutate: (...args: unknown[]) => mockMutate(...args),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values && 'count' in values ? `${key}:${values.count}` : key,
}));

function PreferencesDisplay() {
  const { gridColumns, gridRows, gridClassName } = useUserPreferences();
  return (
    <div data-testid="prefs-state">
      {`${gridColumns}x${gridRows}|${gridClassName}`}
    </div>
  );
}

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

describe('Explore Pagination', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    window.localStorage.clear();
    resetGuestGridPrefsForTest();
    mockAuthState.user = null;
    mockAuthState.updateUserPreferences = vi.fn();
    mockMutate.mockReset();
    mockToastError.mockReset();
    window.history.replaceState(null, '', '/explore/movie/');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders column (3..10) and row (2..10) selects even when totalPages is 1', () => {
    const { rerender } = render(<Pagination currentPage={1} totalPages={4} />);

    const colsSelect = screen.getByLabelText('columnsLabel') as HTMLSelectElement;
    const rowsSelect = screen.getByLabelText('rowsLabel') as HTMLSelectElement;

    expect(Array.from(colsSelect.options).map((o) => Number(o.value))).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(Array.from(rowsSelect.options).map((o) => Number(o.value))).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();

    rerender(<Pagination currentPage={1} totalPages={1} />);
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('columnsLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('rowsLabel')).toBeInTheDocument();
  });

  it('updates useUserPreferences immediately and persists to localStorage for guests', () => {
    render(
      <>
        <PreferencesDisplay />
        <Pagination currentPage={1} totalPages={3} />
      </>
    );

    expect(screen.getByTestId('prefs-state')).toHaveTextContent('5x4|');

    fireEvent.change(screen.getByLabelText('columnsLabel'), { target: { value: '7' } });
    expect(screen.getByTestId('prefs-state')).toHaveTextContent(
      '7x4|grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7'
    );

    fireEvent.change(screen.getByLabelText('rowsLabel'), { target: { value: '6' } });
    expect(screen.getByTestId('prefs-state')).toHaveTextContent('7x6|');
    expect(JSON.parse(window.localStorage.getItem('blackbox_grid_preferences') || '{}')).toEqual({
      gridColumns: 7,
      gridRows: 6,
    });
  });

  it('optimistically updates authenticated users, saves via mutation, and rolls back on failure', async () => {
    mockMutate.mockResolvedValueOnce({ data: { updatePreferences: { id: 'u1' } } });

    let setHarnessUser: React.Dispatch<
      React.SetStateAction<{ id: string; gridColumns?: number; gridRows?: number }>
    > | null = null;
    const updateSpy = vi.fn((prefs) => {
      setHarnessUser?.((prev) => ({ ...prev, ...prefs }));
    });
    mockAuthState.updateUserPreferences = updateSpy;

    function StatefulAuthHarness() {
      const [user, setUser] = useState<{ id: string; gridColumns?: number; gridRows?: number }>({
        id: 'u1',
        gridColumns: 5,
        gridRows: 4,
      });
      setHarnessUser = setUser;
      mockAuthState.user = user;
      return (
        <>
          <PreferencesDisplay />
          <Pagination currentPage={1} totalPages={3} />
        </>
      );
    }

    render(<StatefulAuthHarness />);

    fireEvent.change(screen.getByLabelText('columnsLabel'), { target: { value: '8' } });

    expect(updateSpy).toHaveBeenCalledWith({
      gridColumns: 8,
      gridRows: 4,
    });
    expect(screen.getByTestId('prefs-state')).toHaveTextContent(
      '8x4|grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8'
    );
    expect(mockMutate).toHaveBeenCalledWith({
      mutation: UPDATE_PREFERENCES,
      variables: { gridColumns: 8, gridRows: 4 },
    });

    mockMutate.mockRejectedValueOnce(new Error('Network error'));
    fireEvent.change(screen.getByLabelText('rowsLabel'), { target: { value: '9' } });

    expect(screen.getByTestId('prefs-state')).toHaveTextContent('8x9|');

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('saveError');
      expect(screen.getByTestId('prefs-state')).toHaveTextContent('8x4|');
    });
  });

  it('recalculates the page URL when increasing items per page', () => {
    window.history.replaceState(null, '', '/explore/movie/?page=3');
    const { rerender } = render(<Pagination currentPage={3} totalPages={5} />);

    // 5x4 = 20/page, page 3 starts at item index 40 -> 5x8 = 40/page puts item 40 on page 2
    fireEvent.change(screen.getByLabelText('rowsLabel'), { target: { value: '8' } });
    expect(window.location.search).toBe('?page=2');

    resetGuestGridPrefsForTest();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/explore/movie/?page=2');
    rerender(<Pagination currentPage={2} totalPages={5} />);

    // 5x4 = 20/page, page 2 starts at item index 20 -> 5x10 = 50/page puts item 20 on page 1
    fireEvent.change(screen.getByLabelText('rowsLabel'), { target: { value: '10' } });
    expect(window.location.search).toBe('');
  });
});
