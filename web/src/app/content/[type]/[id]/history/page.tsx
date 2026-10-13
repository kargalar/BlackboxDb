import React from 'react';
import { getContentById, fetchContentEditHistory } from '@/services/graphql/content';
import { EditHistoryDiff } from '@/components/organisms/EditHistoryDiff';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { notFound } from 'next/navigation';
import Image from 'next/image';

interface ContentHistoryPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

export default async function ContentHistoryPage({ params }: ContentHistoryPageProps) {
  const { type, id } = await params;

  const [{ data: content, error: contentError }, { data: history, error: historyError }] =
    await Promise.all([getContentById(id), fetchContentEditHistory(id, 100)]);

  if (contentError || !content) {
    notFound();
  }

  const edits = history || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href={`/content/${type}/${id}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Content
        </Link>

        <div className="flex items-center gap-4">
          {content.posterUrl ? (
            <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 shadow-lg">
              <Image src={content.posterUrl} alt={content.title} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-16 h-24 rounded-lg bg-slate-800 shrink-0" />
          )}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Edit History</h1>
            <p className="text-xl text-slate-300">
              {content.title}{' '}
              {content.releaseDate && `(${new Date(content.releaseDate).getFullYear()})`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {edits.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <Clock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-1">No edit history found</h3>
            <p className="text-slate-500">There are no recorded edits for this content yet.</p>
          </div>
        ) : (
          <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
            {edits.map((edit, index) => (
              <div
                key={edit.id}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8 last:mb-0"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-slate-900 bg-slate-800 text-slate-400 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  {edit.actor?.picturePath ? (
                    <Image
                      src={edit.actor.picturePath}
                      alt={edit.actor.username}
                      fill
                      sizes="40px"
                      unoptimized
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {edit.actor?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-700/50 bg-slate-800/50 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-slate-200">
                      {edit.actor?.username || 'System'}
                    </div>
                    <time className="text-xs text-slate-500 font-mono">
                      {new Date(edit.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>

                  <EditHistoryDiff history={edit} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
