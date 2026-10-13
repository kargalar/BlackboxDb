/**
 * Yorum/cevap sayısına göre opacity sınıfı döndürür.
 * Daha fazla yorum = daha belirgin (yüksek opacity).
 *
 * 0 yorum: %30 opacity
 * 1-2: %45
 * 3-5: %60
 * 6-10: %75
 * 11-20: %90
 * 20+: %100
 */
export function getCommentCountClass(count: number | undefined | null): string {
  const val = count || 0;
  if (val === 0) return 'text-white/30';
  if (val <= 2) return 'text-white/40';
  if (val <= 5) return 'text-white/60';
  if (val <= 10) return 'text-white/70';
  if (val <= 20) return 'text-white/90';
  return 'text-white';
}

/**
 * Yorum sayısına göre font-weight sınıfı döndürür.
 * Yüksek yorum sayısı daha kalın font kullanır.
 */
export function getCommentCountWeight(count: number | undefined | null): string {
  const val = count || 0;
  if (val <= 2) return 'font-normal';
  if (val <= 10) return 'font-medium';
  return 'font-semibold';
}
