/**
 * Custom Hook: useContentActions
 *
 * İçerik kartları için ortak event handler'ları sağlar.
 * Event propagation'ı yönetir ve debug log'ları ekler.
 * Auth kontrolü yapar — giriş yapmamış kullanıcılar için LoginRequiredDialog gösterir.
 *
 * Bu hook MovieCard, TvCard, BookCard ve GameCard'larda
 * tekrarlanan event handler kodunu ortadan kaldırır.
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginRequired } from '@/components/atoms/LoginRequiredDialog';

interface UseContentActionsProps<T = number | string> {
  contentId: T;
  contentType?: string;
  onWatch?: (id: T) => void;
  onToggleFavorite?: (id: T) => void;
  onToggleWatchlist?: (id: T) => void;
  onToggleContinuing?: (id: T) => void;
}

interface ContentActionsHandlers {
  handleWatch: (e: React.MouseEvent) => void;
  handleToggleFavorite: (e: React.MouseEvent) => void;
  handleToggleWatchlist: (e: React.MouseEvent) => void;
  handleToggleContinuing: (e: React.MouseEvent) => void;
}

/**
 * useContentActions Hook
 *
 * İçerik aksiyonları için event handler'lar oluşturur.
 * Event propagation'ı durdurur ve debug log'ları ekler.
 * Giriş yapmamış kullanıcılara LoginRequiredDialog gösterir.
 *
 * @example
 * ```tsx
 * const { handleWatch, handleToggleFavorite, handleToggleWatchlist } =
 *   useContentActions({
 *     contentId: movie.id,
 *     contentType: 'movie',
 *     onWatch,
 *     onToggleFavorite,
 *     onToggleWatchlist
 *   });
 * ```
 */
export function useContentActions<T = number | string>({
  contentId,
  contentType = 'content',
  onWatch,
  onToggleFavorite,
  onToggleWatchlist,
  onToggleContinuing,
}: UseContentActionsProps<T>): ContentActionsHandlers {
  const { user } = useAuth();

  // Try to use LoginRequired context - fallback gracefully if not available
  let showLoginDialog: ((msg?: string, url?: string) => void) | null = null;
  try {
    const loginRequired = useLoginRequired();
    showLoginDialog = loginRequired.showLoginDialog;
  } catch {
    // LoginRequiredProvider not mounted - skip auth check
  }

  const requireAuth = useCallback(
    (action: string): boolean => {
      if (user) return true;

      if (showLoginDialog) {
        showLoginDialog(
          `Bu içeriği ${action} için giriş yapmalısın.`,
          typeof window !== 'undefined' ? window.location.pathname : undefined
        );
      }
      console.warn(`⚠️ ${contentType} ${action}: user not logged in`);
      return false;
    },
    [user, showLoginDialog, contentType]
  );

  /**
   * Watch/Read/Play handler
   */
  const handleWatch = useCallback(
    (e: React.MouseEvent) => {
      console.log(`📊 ${contentType} handleWatch called for:`, contentId);
      e.preventDefault();
      e.stopPropagation();

      if (!requireAuth('işaretlemek')) return;

      if (onWatch) {
        console.log(`✅ Executing onWatch for ${contentType}:`, contentId);
        onWatch(contentId);
      } else {
        console.warn(`⚠️ onWatch not provided for ${contentType}:`, contentId);
      }
    },
    [contentId, contentType, onWatch, requireAuth]
  );

  /**
   * Favorite toggle handler
   */
  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      console.log(`❤️ ${contentType} handleToggleFavorite called for:`, contentId);
      e.preventDefault();
      e.stopPropagation();

      if (!requireAuth('favorilere eklemek')) return;

      if (onToggleFavorite) {
        console.log(`✅ Executing onToggleFavorite for ${contentType}:`, contentId);
        onToggleFavorite(contentId);
      } else {
        console.warn(`⚠️ onToggleFavorite not provided for ${contentType}:`, contentId);
      }
    },
    [contentId, contentType, onToggleFavorite, requireAuth]
  );

  /**
   * Watchlist toggle handler
   */
  const handleToggleWatchlist = useCallback(
    (e: React.MouseEvent) => {
      console.log(`🔖 ${contentType} handleToggleWatchlist called for:`, contentId);
      e.preventDefault();
      e.stopPropagation();

      if (!requireAuth('listeye eklemek')) return;

      if (onToggleWatchlist) {
        console.log(`✅ Executing onToggleWatchlist for ${contentType}:`, contentId);
        onToggleWatchlist(contentId);
      } else {
        console.warn(`⚠️ onToggleWatchlist not provided for ${contentType}:`, contentId);
      }
    },
    [contentId, contentType, onToggleWatchlist, requireAuth]
  );

  /**
   * Continuing toggle handler
   */
  const handleToggleContinuing = useCallback(
    (e: React.MouseEvent) => {
      console.log(`▶️ ${contentType} handleToggleContinuing called for:`, contentId);
      e.preventDefault();
      e.stopPropagation();

      if (!requireAuth('devam ediyor olarak işaretlemek')) return;

      if (onToggleContinuing) {
        console.log(`✅ Executing onToggleContinuing for ${contentType}:`, contentId);
        onToggleContinuing(contentId);
      } else {
        console.warn(`⚠️ onToggleContinuing not provided for ${contentType}:`, contentId);
      }
    },
    [contentId, contentType, onToggleContinuing, requireAuth]
  );

  return {
    handleWatch,
    handleToggleFavorite,
    handleToggleWatchlist,
    handleToggleContinuing,
  };
}

export default useContentActions;
