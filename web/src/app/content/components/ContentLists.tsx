'use client';

import { useQuery } from '@apollo/client/react';
import {
  GET_LISTS_CONTAINING_CONTENT,
  GET_LISTS_CONTAINING_CONTENT_COUNT,
} from '@/services/graphql/listQueries';
import { CompactListCard } from '@/components/organisms/lists/CompactListCard';
import { List } from 'lucide-react';
import type { UserList } from '@/services/graphql/listTypes';
import Link from 'next/link';

interface ContentListsProps {
  contentId: string;
  type: string;
}

export default function ContentLists({ contentId, type }: ContentListsProps) {
  const { data, loading, error } = useQuery<{ listsContainingContent: UserList[] }>(
    GET_LISTS_CONTAINING_CONTENT,
    {
      variables: { contentId, limit: 6, offset: 0 },
      skip: !contentId,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: countData } = useQuery<{ listsContainingContentCount: number }>(
    GET_LISTS_CONTAINING_CONTENT_COUNT,
    {
      variables: { contentId },
      skip: !contentId,
      fetchPolicy: 'cache-and-network',
    }
  );

  if (loading) return null; // or a skeleton
  if (error) {
    console.error('Error fetching content lists:', error);
    return null;
  }

  const lists: UserList[] = data?.listsContainingContent || [];
  const totalCount = countData?.listsContainingContentCount || lists.length;

  if (lists.length === 0) {
    // Hiç liste yoksa veya boşsa, bileşeni sayfayı bozmadan gizle.
    return null;
  }

  const displayLists = lists.slice(0, 6);

  return (
    <div className="mb-6 lg:mb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 lg:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <List className="w-5 h-5 md:w-6 md:h-6 text-accent" />
            Bu İçeriği Barındıran Listeler
          </h2>
          <p className="text-sm text-foreground/60 mt-1">Toplam {totalCount} adet liste bulundu</p>
        </div>

        {totalCount > 6 && (
          <Link
            href={`/content/${type}/${contentId}/lists`}
            className="mt-4 md:mt-0 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Tümünü Gör
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {displayLists.map((list) => (
          <CompactListCard key={list.id} list={list} />
        ))}
      </div>
    </div>
  );
}
