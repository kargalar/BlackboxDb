'use client';

import React from 'react';
import Link from 'next/link';
import type { UserList } from '@/services/graphql/listTypes';
import { PosterCard } from '@/components/atoms/PosterCard';
import { getContentImageUrl } from '@/lib/image-utils';
import { FolderOpen } from 'lucide-react';

export function CompactListCard({ list }: { list: UserList }) {
  const previewItems = [...(list.items ?? [])]
    .sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
    )
    .slice(0, 3);

  return (
    <Link
      href={`/lists/${list.owner.username}/${list.id}` as any}
      className="group flex flex-col gap-3 rounded-[20px] border border-white/5 bg-white/[0.02] p-3 transition-all hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.04]"
    >
      <div className="flex h-[130px] w-full items-end justify-center overflow-hidden rounded-xl bg-white/[0.02]  px-4 pt-4">
        {previewItems.length > 0 ? (
          previewItems.map((item, index) => (
            <div
              key={item.id}
              className="relative -ml-6 first:ml-0 transition-transform duration-300 group-hover:-translate-y-2"
              style={{ zIndex: index + 1, transitionDelay: `${index * 30}ms` }}
            >
              <PosterCard
                src={
                  item.content.posterUrl
                    ? getContentImageUrl(item.content.posterUrl, 185, 'poster')
                    : undefined
                }
                alt={item.content.title}
                hoverZoom={false}
                useNextImage={false}
                rounded="lg"
                className="h-[110px] w-[74px] border border-white/10 bg-gray-900 shadow-xl"
                fallback={
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-900 px-1 text-center text-[8px] text-gray-500">
                    <FolderOpen size={14} />
                  </div>
                }
              />
            </div>
          ))
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-gray-500 pb-4">
            <FolderOpen size={24} className="mb-2 opacity-30" />
            <span className="text-xs opacity-50">İçerik yok</span>
          </div>
        )}
      </div>

      <div className="min-w-0 px-2 pb-1 text-center">
        <h3 className="truncate text-sm font-medium text-gray-200 transition-colors group-hover:text-white">
          {list.name}
        </h3>
      </div>
    </Link>
  );
}
