import type { Route } from 'next';
import { igdbImageUrl } from '@/services/api/igdb';
import ContentCard from '@/components/ui/ContentCard';

type Game = {
  id: number;
  name: string;
  cover?: { image_id: string };
  first_release_date?: number;
};

export default function GameCard({ game, size = 'medium' }: { game: Game; size?: 'small' | 'medium' | 'large' }) {
  const year = game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined;
  const href = (`/content/game/${game.id}`) as Route;
  return (
    <ContentCard
      href={href}
      title={game.name}
      subtitle={year ? String(year) : undefined}
      posterSrc={game.cover?.image_id ? igdbImageUrl(game.cover.image_id, 'cover_big') : null}
  size={size}
  useNextImage
    />
  );
}
