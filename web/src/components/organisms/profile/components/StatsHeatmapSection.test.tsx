import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import english from '../../../../../messages/en.json';
import turkish from '../../../../../messages/tr.json';
import { StatsHeatmapSection } from './StatsHeatmapSection';

const watched = {
  movies: [
    { is_consumed: true, user_date: '2024-11-10T12:00:00Z' },
    { is_consumed: true, user_date: '2024-11-11T12:00:00Z' },
  ],
  tv: [],
  games: [],
  books: [],
};

describe.each([
  { locale: 'en', messages: english, weekday: 'Tue', month: 'Nov', streak: '2 days' },
  { locale: 'tr', messages: turkish, weekday: 'Sal', month: 'Kas', streak: '2 gün' },
])('profile activity heatmap in $locale', ({ locale, messages, weekday, month, streak }) => {
  it.each([
    { variant: 'compact', monthLabelCount: 1 },
    { variant: 'detailed', monthLabelCount: 3 },
  ] as const)('renders localized labels in the $variant view', ({ variant, monthLabelCount }) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        <StatsHeatmapSection watched={watched} variant={variant} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText(weekday)).toBeInTheDocument();
    expect(screen.getAllByText(month)).toHaveLength(monthLabelCount);
    if (variant === 'detailed') expect(screen.getByText(streak)).toBeInTheDocument();
  });
});
