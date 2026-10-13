import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { UserIcon } from '@/components/atoms/icons/SidebarIcons';
import type { PersonData } from '@/services/graphql/person';

interface PersonCardProps {
  person: PersonData;
}

export const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
  return (
    <Link href={`/person/${person.id}` as Route} className="group block">
      <div className="glass-card overflow-hidden h-full flex flex-col hover:scale-[1.02] transition-all duration-300">
        <div className="relative aspect-[2/3] w-full bg-gray-900 overflow-hidden">
          {person.profileUrl ? (
            <Image
              src={person.profileUrl}
              alt={person.name}
              fill
              sizes="(max-width: 640px) 100vw, 240px"
              unoptimized
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
              <UserIcon className="w-16 h-16 opacity-50" />
            </div>
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-black/90 opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 flex-1 flex flex-col justify-end z-10 -mt-16 bg-black">
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-amber-400 transition-colors">
            {person.name}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-1">
            {person.roles?.join(', ') || person.gender || 'Bilinmiyor'}
          </p>
          {person.roleCount !== undefined && person.roleCount > 0 && (
            <p className="text-xs text-amber-500/80 mt-2">{person.roleCount} Yapımda</p>
          )}
        </div>
      </div>
    </Link>
  );
};
