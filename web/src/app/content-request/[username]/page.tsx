'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { deleteContentRequest, listMyContentRequests } from '@/services/adminService';
import type { ContentRequest } from '@/services/graphql/admin';
import { Plus } from 'lucide-react';
import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import { refreshPendingContentRequestsBadge } from '@/features/admin/hooks/usePendingContentRequestsCount';
import {
  DELETE_CONTRIBUTION,
  MY_CONTRIBUTIONS,
  type Contribution,
} from '@/services/graphql/contribution';

const typeSlugMap: Record<number, string> = {
  1: 'movie',
  2: 'tv',
  3: 'game',
  4: 'book',
  5: 'music',
};

const SEARCH_CONTENT_BY_TITLE = gql`
  query SearchContentByTitle($title: String!, $contentTypeId: Int) {
    searchContentByTitle(title: $title, contentTypeId: $contentTypeId) {
      id
      contentTypeId
    }
  }
`;

export interface CombinedRequest {
  id: number;
  isEdit: boolean; // True for Contribution, False for ContentRequest
  title: string;
  contentTypeId: number;
  releaseDate?: string;
  createdAt: string;
  status: string;
  reason?: string;
  payload?: any;
  contentId?: string;
  originalId?: number; // Real ID for deletion etc
}

export default function ContentRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<CombinedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      // Fetch content requests (New Content)
      const { data: requestsData } = await listMyContentRequests();

      // Fetch contributions (Edits)
      const { data: contribData } = await apolloClient.query<{
        myContributions: Array<
          Contribution & {
            content?: Contribution['content'] & { contentTypeId?: number };
          }
        >;
      }>({
        query: MY_CONTRIBUTIONS,
        fetchPolicy: 'network-only',
      });

      const reqs: CombinedRequest[] = (requestsData ?? []).map((r) => ({
        id: Number(`100${r.id}`), // Create unique ID for the list
        originalId: r.id,
        isEdit: false,
        title: r.title,
        contentTypeId: r.contentTypeId,
        releaseDate: r.releaseDate,
        createdAt: r.createdAt,
        status: r.status,
        reason: r.reason,
        payload: r.payload,
      }));

      const contribs: CombinedRequest[] = (contribData?.myContributions ?? []).map((c) => ({
        id: Number(`200${c.id}`), // Create unique ID for the list
        originalId: c.id,
        isEdit: true,
        title: c.content?.title || 'Bilinmeyen İçerik',
        contentTypeId: c.content?.contentTypeId || 1, // Fallback
        createdAt: c.createdAt,
        status: c.status.toLowerCase(), // APPROVED -> approved
        payload: c.payload,
        contentId: c.content?.id,
        reason: c.payload?.rejectionReason,
      }));

      // Merge and sort descending
      const merged = [...reqs, ...contribs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setItems(merged);
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusText = (s: string) => {
    if (s === 'pending') return 'Beklemede';
    if (s === 'approved') return 'Onaylandı';
    return 'Reddedildi';
  };

  const statusColor = (s: string) => {
    if (s === 'pending') return 'bg-white/10 text-white/60 border-white/20';
    if (s === 'approved') return 'bg-white/10 text-green-400 border-white/20';
    return 'bg-white/10 text-red-400 border-white/20';
  };

  const typeLabel = (id: number) => {
    switch (id) {
      case 1:
        return 'Film';
      case 2:
        return 'Dizi';
      case 3:
        return 'Oyun';
      case 4:
        return 'Kitap';
      case 5:
        return 'Müzik';
      default:
        return 'Bilinmiyor';
    }
  };

  const handleItemClick = async (it: CombinedRequest) => {
    if (it.status !== 'approved') return;

    if (it.isEdit) {
      // It's a contribution, payload might have contentId or it.payload.id or it.content.id
      // Wait, we mapped it from c.content.id, we should just use that.
      // Let's rely on the fallback below for searching if contentId is not in payload.
      // Actually, in `myContributions` we have `c.content.id`. I'll just check `it.payload?.contentId`
      // or search by title.
    }

    // 1. First, check if the content ID is stored in the payload JSON
    const contentId = it.payload?.contentId || it.payload?.id;
    if (contentId) {
      const typeSlug = typeSlugMap[it.contentTypeId] || 'movie';
      router.push(`/content/${typeSlug}/${contentId}` as any);
      return;
    }

    // 2. Otherwise, fall back to searching by title
    try {
      const { data } = await apolloClient.query({
        query: SEARCH_CONTENT_BY_TITLE,
        variables: { title: it.title, contentTypeId: it.contentTypeId },
      });
      const content = (data as any)?.searchContentByTitle;
      if (content) {
        const typeSlug =
          typeSlugMap[content.contentTypeId] || typeSlugMap[it.contentTypeId] || 'movie';
        router.push(`/content/${typeSlug}/${content.id}` as any);
      }
    } catch (err) {
      console.error('Content search failed:', err);
    }
  };

  const handleRetry = (it: CombinedRequest) => {
    if (it.isEdit) {
      const contentId = it.contentId || it.payload?.contentId || it.payload?.id;
      if (contentId) {
        router.push(
          `/add-content?id=${encodeURIComponent(contentId)}&contributionId=${it.originalId}` as any
        );
      }
    } else {
      router.push(`/add-content?requestId=${it.originalId}` as any);
    }
  };

  const handleDelete = async (it: CombinedRequest) => {
    if (it.isEdit) {
      const confirmed = window.confirm('Bu bekleyen düzenleme talebini silmek istiyor musunuz?');
      if (!confirmed || !it.originalId) return;
      setDeletingId(it.originalId);
      try {
        await apolloClient.mutate({
          mutation: DELETE_CONTRIBUTION,
          variables: { id: it.originalId },
        });
        setItems((prev) => prev.filter((item) => item.id !== it.id));
        refreshPendingContentRequestsBadge();
      } catch (error) {
        console.error('Contribution delete failed:', error);
        alert('Düzenleme talebi silinemedi');
      } finally {
        setDeletingId(null);
      }
      return;
    }

    const confirmed = window.confirm('Bu bekleyen talebi silmek istiyor musunuz?');
    if (!confirmed) return;

    setDeletingId(it.originalId!);
    const { error } = await deleteContentRequest(it.originalId!);
    if (error) {
      alert('Talep silinemedi');
      setDeletingId(null);
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== it.id));
    refreshPendingContentRequestsBadge();
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-white">Taleplerim</h1>
          <button
            onClick={() => router.push('/add-content')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/10"
          >
            <Plus className="w-5 h-5" />
            İçerik İste
          </button>
        </div>

        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <p className="text-white/40">Henüz bir talebiniz yok.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  onClick={() => handleItemClick(it)}
                  className={`bg-white/5 border border-white/10 rounded-lg p-4 flex items-start justify-between gap-4 hover:bg-white/[0.07] transition-colors ${
                    it.status === 'approved' ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-medium text-white truncate ${
                          it.status === 'approved' ? 'hover:text-violet-400 transition-colors' : ''
                        }`}
                      >
                        {it.title}
                      </h3>
                      <span className="px-2 py-0.5 text-xs rounded bg-white/10 text-white/50">
                        {typeLabel(it.contentTypeId)}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${it.isEdit ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}
                      >
                        {it.isEdit ? 'Düzenleme' : 'Yeni İçerik'}
                      </span>
                    </div>
                    <div className="text-xs text-white/30">
                      {new Date(it.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {it.releaseDate && ` • ${it.releaseDate}`}
                    </div>
                    {it.status === 'rejected' && it.reason && (
                      <p className="mt-2 text-xs leading-relaxed text-red-300/80 whitespace-pre-wrap">
                        {it.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 text-xs rounded border ${statusColor(it.status)}`}>
                      {statusText(it.status)}
                    </span>
                    {it.status === 'rejected' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(it);
                        }}
                        className="px-3 py-1 text-xs rounded border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Tekrar iste
                      </button>
                    )}
                    {it.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(it);
                          }}
                          className="px-3 py-1 text-xs rounded border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(it);
                          }}
                          disabled={deletingId === it.originalId}
                          className="px-3 py-1 text-xs rounded border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === it.originalId ? 'Siliniyor...' : 'Sil'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
