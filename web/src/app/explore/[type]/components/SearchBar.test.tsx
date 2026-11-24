import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchBar } from './SearchBar';
import { useExploreFilters } from '../hooks/useExploreFilters';
import { getExplorePage, updateExploreUrl } from '../../exploreUrl';

vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../hooks/contentSearch', () => ({ getFilterCounts: async () => ({}) }));

afterEach(() => vi.useRealTimers());

describe('Explore search', () => {
  it('keeps filters changed while typing and cancels a draft when navigating back', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/explore/movie/?q=old&page=4#results');
    const { rerender } = render(<SearchBar />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new' } });

    const params = new URLSearchParams(window.location.search);
    params.append('genre', '12');
    updateExploreUrl(params);
    rerender(<SearchBar />);
    act(() => vi.advanceTimersByTime(400));
    expect(window.location.search).toBe('?q=new&genre=12');
    expect(window.location.hash).toBe('#results');
    rerender(<SearchBar />);

    fireEvent.change(input, { target: { value: 'unsaved draft' } });
    act(() => {
      window.history.replaceState(null, '', '/explore/movie/?q=old&genre=12#results');
      window.dispatchEvent(new PopStateEvent('popstate'));
      vi.advanceTimersByTime(400);
    });
    expect(input).toHaveValue('old');
    expect(window.location.search).toBe('?q=old&genre=12');
  });

  it('keeps the selected sort order on a search results page', async () => {
    window.history.replaceState(null, '', '/explore/movie/?q=new&page=4');
    const { result, rerender } = renderHook(() => useExploreFilters('movie', 1));
    await act(async () => {
      result.current.handleSortChange('title', 'asc');
      rerender();
    });
    expect(result.current.sortBy).toBe('title');
    expect(result.current.sortOrder).toBe('asc');
    expect(window.location.search).toBe('?q=new&sortBy=title&sortOrder=asc');
  });

  it('falls back to page one for query values that cannot be sent to GraphQL', () => {
    for (const value of [null, '0', '-3', 'abc', '2junk', '9999999999999999999']) {
      expect(getExplorePage(value, 20)).toBe(1);
    }
    expect(getExplorePage('3', 20)).toBe(3);
  });
});
