import type { Content } from '@/types/content';
import type { ItemStatesMap, FeaturedType, ContentActionHandlers } from '../HomeTabTypes';
import { DEFAULT_ITEM_STATE } from '../HomeTabTypes';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { MoreVertical } from 'lucide-react';

interface FeaturedContentSectionProps {
  featuredMovies: Content[];
  featuredTv: Content[];
  featuredGames: Content[];
  featuredBooks: Content[];
  featuredMusic: Content[];
  featuredType: FeaturedType;
  setFeaturedType: (type: FeaturedType) => void;
  itemStates: ItemStatesMap;
  isOwnProfile: boolean;
  handlers: ContentActionHandlers;
  onOpenDialog?: () => void;
}

/** Featured content display section with type tabs */
export default function FeaturedContentSection({
  featuredMovies,
  featuredTv,
  featuredGames,
  featuredBooks,
  featuredMusic,
  featuredType,
  setFeaturedType,
  itemStates,
  isOwnProfile,
  handlers,
  onOpenDialog,
}: FeaturedContentSectionProps) {
  const allFeaturedCount =
    featuredMovies.length +
    featuredTv.length +
    featuredGames.length +
    featuredBooks.length +
    featuredMusic.length;
  const { gridClassName } = useUserPreferences();

  // Profil sahibiyse ve hiç eklenen içerik yoksa veya başkasının profiliyse ve hiç içerik yoksa gizle
  // Kullanıcı artık öne çıkanları "üç nokta" veya profil ayarlarından kendi ekleyecek (kullanıcı talebi)
  if (allFeaturedCount === 0) {
    return null;
  }

  const tabs = [
    { key: 'movies' as FeaturedType, label: 'Filmler', count: featuredMovies.length },
    { key: 'tv' as FeaturedType, label: 'TV/Dizi', count: featuredTv.length },
    { key: 'games' as FeaturedType, label: 'Oyunlar', count: featuredGames.length },
    { key: 'books' as FeaturedType, label: 'Kitaplar', count: featuredBooks.length },
    { key: 'music' as FeaturedType, label: 'Müzik', count: featuredMusic.length },
  ].filter((tab) => tab.count > 0);

  // We intentionally do not autoroute away from an empty tab here because
  // featuredType is shared with the Edit Dialog. If we switch it here, the user
  // cannot switch to empty tabs in the Dialog to add new content.

  const getFeaturedContent = (): Content[] => {
    switch (featuredType) {
      case 'movies':
        return featuredMovies;
      case 'tv':
        return featuredTv;
      case 'games':
        return featuredGames;
      case 'books':
        return featuredBooks;
      case 'music':
        return featuredMusic;
      default:
        return [];
    }
  };

  const contentTypeForPoster = () => {
    switch (featuredType) {
      case 'games':
        return 'game' as const;
      case 'books':
        return 'book' as const;
      case 'music':
        return 'music' as const;
      case 'tv':
        return 'tv' as const;
      default:
        return 'movie' as const;
    }
  };

  const featured = getFeaturedContent();
  const cType = contentTypeForPoster();

  console.log(
    `⭐ [FeaturedContentSection] Rendering type=${featuredType}, count=${featured.length}`
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Öne Çıkarılan İçerikler</h3>
        {isOwnProfile && onOpenDialog && (
          <button
            onClick={onOpenDialog}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Düzenle"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content Type Tabs */}
      {tabs.length > 1 && (
        <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFeaturedType(key)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                featuredType === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      )}

      {featured.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <p>Bu kategoride içerik bulunmuyor.</p>
        </div>
      ) : (
        <div className={`grid ${gridClassName} gap-2`}>
          {featured.map((content) => {
            const state = itemStates[content.id] || DEFAULT_ITEM_STATE;
            return (
              <InteractivePoster
                key={content.id}
                content={content}
                contentType={cType}
                isConsumed={Boolean(
                  content.isConsumed ??
                  (content as any).is_consumed ??
                  ((content as any).user_rating ?? 0) > 0
                )}
                isFavorite={Boolean(content.isFavorite ?? (content as any).is_favorite)}
                isConsumeLater={Boolean(
                  content.isConsumeLater ?? (content as any).is_consume_later
                )}
                isContinuing={Boolean(content.isContinuing ?? (content as any).is_continuing)}
                viewerIsConsumed={state.isConsumed}
                viewerIsFavorite={state.isFavorite}
                viewerIsConsumeLater={state.isConsumeLater}
                viewerIsContinuing={state.isContinuing}
                rating={(content as any).user_rating ?? (content as any).rating ?? null}
                showActions={true}
                onAddToList={() => handlers.handleAddToList(content, cType)}
                hasReview={Boolean((content as any).hasReview)}
                context="profile"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
