import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmotionFilter } from './EmotionFilter';
import { CONTENT_EMOTIONS } from '@/services/graphql/emotions';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

afterEach(() => {
  cleanup();
});

describe('EmotionFilter', () => {
  it('renders all 8 emoji filter options with counts and triggers toggle/clear', () => {
    const onToggleEmotion = vi.fn();
    const onClear = vi.fn();

    render(
      <EmotionFilter
        selectedEmotions={['romantic']}
        isExpanded={true}
        onToggleSection={vi.fn()}
        onToggleEmotion={onToggleEmotion}
        onClear={onClear}
        filterCounts={{ romantic: 12, scary: 4 }}
      />
    );

    const emotionButtons = CONTENT_EMOTIONS.map(({ id }) =>
      screen.getByRole('button', { name: new RegExp(`EmotionReactions\\.emotions\\.${id}`) })
    );
    expect(emotionButtons).toHaveLength(8);

    const romanticBtn = screen.getByRole('button', {
      name: /EmotionReactions\.emotions\.romantic/,
    });
    expect(romanticBtn).toHaveAttribute('aria-pressed', 'true');
    expect(romanticBtn).toHaveTextContent('😍');
    expect(romanticBtn).toHaveTextContent('12');

    const inspiringBtn = screen.getByRole('button', {
      name: /EmotionReactions\.emotions\.inspiring/,
    });
    expect(inspiringBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(inspiringBtn);
    expect(onToggleEmotion).toHaveBeenCalledWith('inspiring');

    const clearBtn = screen.getByTitle('Temizle');
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
