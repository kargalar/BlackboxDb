import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmotionReactions from './EmotionReactions';
import { CONTENT_EMOTIONS } from '@/services/graphql/emotions';

const mocks = vi.hoisted(() => ({
  getContentEmotionSummary: vi.fn(),
  setContentEmotion: vi.fn(),
  showLoginDialog: vi.fn(),
  user: { id: 'user-1' } as { id: string } | null,
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/components/atoms/LoginRequiredDialog', () => ({
  useLoginRequired: () => ({ showLoginDialog: mocks.showLoginDialog }),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));
vi.mock('@/services/emotionService', () => ({
  getContentEmotionSummary: mocks.getContentEmotionSummary,
  setContentEmotion: mocks.setContentEmotion,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.user = { id: 'user-1' };
});

describe('EmotionReactions', () => {
  it('renders all 8 emotion buttons in a compact 2-row 4-column grid with counts', async () => {
    mocks.getContentEmotionSummary.mockResolvedValue({
      myEmotion: 'romantic',
      counts: [
        { emotion: 'scary', count: 3 },
        { emotion: 'romantic', count: 5 },
        { emotion: 'inspiring', count: 2 },
      ],
    });

    const { container } = render(<EmotionReactions contentId="content-1" />);

    const buttons = await screen.findAllByRole('button');
    expect(buttons).toHaveLength(8);
    expect(CONTENT_EMOTIONS).toHaveLength(8);

    const grid = container.querySelector('.grid.grid-cols-4');
    expect(grid).toBeInTheDocument();

    const romanticBtn = screen.getByRole('button', { name: /emotions\.romantic/ });
    expect(romanticBtn).toHaveAttribute('aria-pressed', 'true');
    expect(romanticBtn).toHaveTextContent('😍');
    expect(romanticBtn).toHaveTextContent('5');

    const inspiringBtn = screen.getByRole('button', { name: /emotions\.inspiring/ });
    expect(inspiringBtn).toHaveAttribute('aria-pressed', 'false');
    expect(inspiringBtn).toHaveTextContent('🤩');
    expect(inspiringBtn).toHaveTextContent('2');
  });

  it('submits the selected emotion and toggles off when clicked again', async () => {
    mocks.getContentEmotionSummary.mockResolvedValue({
      myEmotion: 'inspiring',
      counts: [{ emotion: 'inspiring', count: 1 }],
    });
    mocks.setContentEmotion.mockResolvedValue({
      myEmotion: null,
      counts: [],
    });

    render(<EmotionReactions contentId="content-2" />);

    const inspiringBtn = await screen.findByRole('button', { name: /emotions\.inspiring/ });
    fireEvent.click(inspiringBtn);

    await waitFor(() => {
      expect(mocks.setContentEmotion).toHaveBeenCalledWith('content-2', null);
    });
    expect(inspiringBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
