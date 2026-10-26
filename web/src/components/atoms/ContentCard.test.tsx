import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContentCard from './ContentCard';
import type { Route } from 'next';

const preferences = vi.hoisted(() => ({
  posterRatingEnabled: true,
  posterIconsBelow: true,
  posterZoomEnabled: false,
}));
vi.mock('@/hooks/useUserPreferences', () => ({ useUserPreferences: () => preferences }));

afterEach(() => {
  cleanup();
  preferences.posterRatingEnabled = true;
  preferences.posterIconsBelow = true;
});

const props = { href: '/content/movie/1' as Route, title: 'Example' };

describe('poster community rating', () => {
  it('prefers the weighted AVG over TMDB without using the personal rating badge', () => {
    render(
      <ContentCard
        {...props}
        rightTop={<span>Personal: 4</span>}
        communityRating={{ ratingDistribution: [0, 0, 0, 0, 0, 0, 1, 1, 0, 0], tmdbRating: 9 }}
      />
    );
    expect(screen.getByLabelText('AVG: 7.5/10')).toHaveTextContent('7.5');
    expect(screen.queryByText('TMDB')).not.toBeInTheDocument();
    expect(screen.getByText('Personal: 4')).toBeInTheDocument();
  });

  it('falls back to TMDB when there are no AVG votes', () => {
    preferences.posterIconsBelow = false;
    render(
      <ContentCard {...props} communityRating={{ ratingDistribution: [0, 0], tmdbRating: 8.2 }} />
    );
    expect(screen.getByLabelText('TMDB: 8.2/10')).toBeInTheDocument();
  });

  it('hides the score when the preference is disabled', () => {
    preferences.posterRatingEnabled = false;
    render(<ContentCard {...props} communityRating={{ ratingDistribution: [1], tmdbRating: 8 }} />);
    expect(screen.queryByText('AVG')).not.toBeInTheDocument();
    expect(screen.queryByText('TMDB')).not.toBeInTheDocument();
  });

  it.each([undefined, null, 0, NaN])(
    'omits the badge when neither score is available (%s)',
    (tmdbRating) => {
      render(<ContentCard {...props} communityRating={{ tmdbRating }} />);
      expect(screen.queryByText('AVG')).not.toBeInTheDocument();
      expect(screen.queryByText('TMDB')).not.toBeInTheDocument();
    }
  );
});
