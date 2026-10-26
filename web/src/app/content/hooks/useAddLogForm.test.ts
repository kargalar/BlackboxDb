import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecentTags, getRecentTaggedUsers } from '@/lib/log-suggestions';
import { useAddLogForm } from './useAddLogForm';

vi.mock('@/services/userContentService', () => ({
  getAllUserContentLogs: vi.fn().mockResolvedValue({ data: [] }),
}));

const options = {
  isOpen: true,
  contentType: 'movie',
  contentId: '1',
  onSave: vi.fn(),
  onClose: vi.fn(),
  t: (key: string) => key,
};

describe('log suggestions', () => {
  beforeEach(() => localStorage.clear());

  it('remembers additions before saving and offers them when another form opens', async () => {
    const first = renderHook(() => useAddLogForm(options));
    const user = { id: 'custom-1', username: 'Deniz', isCustom: true };
    act(() => {
      first.result.current.handleTagsChange('Cinema');
      first.result.current.handleTaggedUserAdd(user);
    });
    await waitFor(() => {
      expect(first.result.current.availableTags).toContain('Cinema');
      expect(first.result.current.previousTaggedUsers).toContainEqual(user);
    });
    first.unmount();

    const second = renderHook(() => useAddLogForm({ ...options, contentId: '2' }));
    await waitFor(() => {
      expect(second.result.current.availableTags).toContain('Cinema');
      expect(second.result.current.previousTaggedUsers).toContainEqual(user);
    });
    expect(second.result.current.formData.tags).toBe('');
    expect(second.result.current.formData.taggedUsersObj).toEqual([]);
    expect(options.onSave).not.toHaveBeenCalled();
  });

  it('deduplicates custom names with different generated ids and tag casing', async () => {
    const { result } = renderHook(() => useAddLogForm(options));
    act(() => {
      result.current.handleTagsChange(' Cinema, cinema ');
      result.current.handleTaggedUserAdd({ id: 'custom-1', username: 'Deniz', isCustom: true });
      result.current.handleTaggedUserAdd({ id: 'custom-2', username: 'deniz', isCustom: true });
    });
    await waitFor(() => expect(result.current.previousTaggedUsers).toHaveLength(1));
    expect(getRecentTags()).toEqual(['Cinema']);
    expect(getRecentTaggedUsers()).toHaveLength(1);
  });

  it('ignores malformed stored history', () => {
    localStorage.setItem('bb_recent_tags', '{');
    localStorage.setItem('bb_recent_with_who', JSON.stringify([null, {}, { username: 3 }]));
    expect(getRecentTags()).toEqual([]);
    expect(getRecentTaggedUsers()).toEqual([]);
  });
});
