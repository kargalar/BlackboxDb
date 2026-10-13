import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';

interface ListItemAddedByMetaProps {
  username: string;
  profileHref: string;
  picturePath?: string;
  isEditing?: boolean;
}

export default function ListItemAddedByMeta({
  username,
  profileHref,
  picturePath,
  isEditing = false,
}: ListItemAddedByMetaProps) {
  return (
    <Link
      href={profileHref as Route}
      aria-label={`${username} profiline git`}
      title={username}
      className={`absolute bottom-2 right-2 z-20 block transition-transform ${
        isEditing ? 'pointer-events-none' : 'hover:scale-105'
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-gray-900 shadow-lg ring-1 ring-black/50 backdrop-blur-sm">
        {picturePath ? (
          <Image
            src={picturePath}
            alt={username}
            width={32}
            height={32}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-semibold text-white">
            {username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </Link>
  );
}
