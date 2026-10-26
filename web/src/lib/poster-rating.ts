export interface PosterRatingData {
  ratingDistribution?: number[] | null;
  tmdbRating?: number | null;
}

export function getPosterRating({ ratingDistribution, tmdbRating }: PosterRatingData) {
  const totalVotes = ratingDistribution?.reduce((sum, count) => sum + count, 0) ?? 0;
  if (totalVotes > 0 && ratingDistribution) {
    const totalScore = ratingDistribution.reduce(
      (sum, count, index) => sum + count * (index + 1),
      0
    );
    return { source: 'AVG', value: totalScore / totalVotes } as const;
  }

  if (tmdbRating != null && Number.isFinite(tmdbRating) && tmdbRating > 0) {
    return { source: 'TMDB', value: tmdbRating } as const;
  }

  return null;
}
