'use client';

import React, { use } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_LISTS_CONTAINING_CONTENT,
  GET_LISTS_CONTAINING_CONTENT_COUNT,
  VOTE_LIST,
} from '@/services/graphql/listQueries';
import { GET_CONTENT } from '@/services/graphql/content';
import { PublicListCard } from '@/components/organisms/lists/PublicListCard';
import { Pagination } from '@/components/molecules/Pagination';
import { useAuth } from '@/contexts/AuthContext';
import { List, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { UserList } from '@/services/graphql/listTypes';

interface ListsPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

const ITEMS_PER_PAGE = 12;

export default function ListsPage({ params }: ListsPageProps) {
  const { type, id } = use(params);
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const router = useRouter();

  const { user } = useAuth();

  const { data: contentData } = useQuery<{ content: { title: string } }>(GET_CONTENT, {
    variables: { id },
    skip: !id,
  });

  const { data, loading, error } = useQuery<{ listsContainingContent: UserList[] }>(
    GET_LISTS_CONTAINING_CONTENT,
    {
      variables: { contentId: id, limit: ITEMS_PER_PAGE, offset },
      skip: !id,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: countData } = useQuery<{ listsContainingContentCount: number }>(
    GET_LISTS_CONTAINING_CONTENT_COUNT,
    {
      variables: { contentId: id },
      skip: !id,
      fetchPolicy: 'cache-and-network',
    }
  );

  const [voteList] = useMutation(VOTE_LIST);

  const handleVote = async (listId: number, voteType: number) => {
    if (!user) return;
    try {
      await voteList({
        variables: { id: listId, voteType },
        optimisticResponse: {
          voteList: {
            __typename: 'UserList',
            id: listId,
            userVote: voteType,
          },
        },
      });
    } catch (err) {
      console.error('Listeye oy verme hatası:', err);
    }
  };

  const contentTitle = contentData?.content?.title || 'İçerik';
  const lists: UserList[] = data?.listsContainingContent || [];
  const totalCount = countData?.listsContainingContentCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    router.push(`/content/${type}/${id}/lists?page=${page}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/content/${type}/${id}`}
          className="inline-flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {contentTitle} Sayfasına Dön
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <List className="w-6 h-6 md:w-8 md:h-8 text-accent" />
            {contentTitle} {type !== 'person' ? 'İçeren Listeler' : 'Barındıran Listeler'}
          </h1>
          <p className="text-foreground/60 mt-2">Toplam {totalCount} adet liste bulundu</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-destructive/10 text-destructive rounded-lg">
          <p>Listeler yüklenirken bir hata oluştu.</p>
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12 bg-secondary/20 rounded-lg text-foreground/60">
          <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Henüz bu içeriği barındıran bir liste yok.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {lists.map((list) => (
              <PublicListCard
                key={list.id}
                list={list}
                onVote={handleVote}
                voteDisabled={!user}
                isOwner={user?.id === list.ownerId}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
