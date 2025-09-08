import Link from 'next/link';
import type { Route } from 'next';
import { igdbImageUrl } from '@/services/api/igdb';

type Game = {
  id: number;
  name: string;
  cover?: { image_id: string };
  first_release_date?: number;
};

export default function GameCard({ game }: { game: Game }) {
  const year = game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined;
  return (
  <Link href={(`/content/game/${game.id}`) as Route} className="group">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
        {game.cover?.image_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={game.name}
            src={igdbImageUrl(game.cover.image_id, 'cover_big')}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-gray-400">Kapak yok</div>
        )}
      </div>
      <div className="mt-2 space-y-1">
        <div className="line-clamp-1 text-sm font-medium text-gray-900 dark:text-white">{game.name}</div>
        {year ? <div className="text-xs text-gray-500 dark:text-gray-400">{year}</div> : null}
      </div>
    </Link>
  );
}
