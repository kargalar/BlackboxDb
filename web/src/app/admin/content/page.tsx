'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUserProfile } from '@/services/database/userService';
import {
  listContent,
  getContentById,
  updateContent,
  deleteContent,
  getContentEditHistory,
  rollbackContentEditHistory,
} from '@/services/adminService';
import type { AdminContent, ContentEditHistory } from '@/services/graphql/admin';
import { AuditSnapshotView, formatAuditFieldLabel } from './components/AuditSnapshotView';
import ContentSearchBar from './ContentSearchBar';
import ContentTypeFilter from './ContentTypeFilter';
import ContentListItem from './ContentListItem';
import { useTranslations, useLocale } from 'next-intl';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const CONTENT_TYPES_QUERY = gql`
  query AdminContentTypes {
    contentTypes {
      id
      name
      slug
    }
  }
`;

export default function AdminContentPage() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminContent[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AdminContent>>({});
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(0);
  const [saving, setSaving] = useState(false);
  const [historyContent, setHistoryContent] = useState<AdminContent | null>(null);
  const [historyItems, setHistoryItems] = useState<ContentEditHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const t = useTranslations('AdminContentPage');
  const locale = useLocale();
  const { data: contentTypeData } = useQuery<{
    contentTypes: Array<{ id: number; name: string; slug: string }>;
  }>(CONTENT_TYPES_QUERY);

  const load = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const prof = await getCurrentUserProfile();
        const can = !!prof.data?.isAdmin || !!prof.data?.isModerator;
        setAllowed(can);
        if (!can) {
          setItems([]);
          return;
        }
        const { data } = await listContent({ search });
        setItems(data);
      } catch (error) {
        console.error('Failed to load admin content', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const startEdit = async (id: string) => {
    const { data } = await getContentById(id);
    setEditing(id);
    setEditData(data || {});
  };

  const save = async () => {
    if (!editing) return;

    const contentTypeIdRaw = editData.contentTypeId;
    const contentTypeId =
      typeof contentTypeIdRaw === 'string' ? parseInt(contentTypeIdRaw, 10) : contentTypeIdRaw;

    if (!contentTypeId || Number.isNaN(contentTypeId)) {
      alert(t('missingContentTypeId'));
      return;
    }

    setSaving(true);
    const { error } = await updateContent(editing, {
      title: editData.title!,
      contentTypeId: Number(contentTypeId),
      description: editData.description?.trim() ? editData.description.trim() : null,
      releaseDate: editData.releaseDate || null,
      runtime: editData.runtime ?? null,
      lockedFields: editData.lockedFields || [],
    });
    setSaving(false);

    if (!error) {
      setEditing(null);
      load();
    } else {
      alert(t('updateFailed'));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const { error } = await deleteContent(id);
    if (!error) load();
  };

  const showHistory = async (content: AdminContent) => {
    setHistoryContent(content);
    setHistoryLoading(true);
    const { data, error } = await getContentEditHistory(content.id);
    setHistoryItems(error ? [] : data || []);
    setHistoryLoading(false);
  };

  const rollback = async (historyId: number) => {
    if (!historyContent || !confirm(t('rollbackConfirm'))) return;
    const { error } = await rollbackContentEditHistory(historyId);
    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      const conflict = message.match(/these fields changed after this edit: ([^\n]+)/);
      alert(conflict ? t('rollbackConflict', { fields: conflict[1] }) : t('rollbackFailed'));
      return;
    }
    await showHistory(historyContent);
    await load();
  };

  const filteredItems =
    typeFilter === 0 ? items : items.filter((c) => Number(c.contentTypeId) === typeFilter);

  const typeCounts = items.reduce(
    (acc, c) => {
      const t = Number(c.contentTypeId);
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50">
          <div className="w-5 h-5 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
          {t('loading')}
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold mb-2">{t('accessDenied')}</h1>
          <p className="text-white/50">{t('accessDeniedDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              <span className="gradient-text">{t('title')}</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {items.length > 0 ? t('contentCount', { count: items.length }) : t('noContent')}
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            {t('backToAdmin')}
          </Link>
        </div>

        {/* Search */}
        <ContentSearchBar
          search={search}
          onSearchChange={setSearch}
          onSearch={load}
          loading={loading}
        />

        {/* Type Filter */}
        <ContentTypeFilter
          activeType={typeFilter}
          onTypeChange={setTypeFilter}
          counts={typeCounts}
          contentTypes={contentTypeData?.contentTypes || []}
        />

        {/* Results info */}
        {typeFilter !== 0 && (
          <p className="text-xs text-white/30">
            {t('resultsCount', { count: filteredItems.length })}
          </p>
        )}

        {/* Content List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-white/50">{t('searchEmpty')}</p>
            <p className="text-white/30 text-sm mt-2">{t('searchEmptyDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((c) => (
              <ContentListItem
                key={c.id}
                content={c}
                isEditing={editing === c.id}
                editData={editData}
                onEditDataChange={setEditData}
                onStartEdit={startEdit}
                onSave={save}
                onCancelEdit={() => setEditing(null)}
                onDelete={remove}
                onShowHistory={() => showHistory(c)}
                saving={saving}
              />
            ))}
          </div>
        )}

        {historyContent && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden bg-surface-panel border border-white/10 rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-semibold text-white">{t('historyTitle')}</h2>
                  <p className="text-sm text-white/40">{historyContent.title}</p>
                </div>
                <button
                  onClick={() => setHistoryContent(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                >
                  {t('close')}
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[calc(80vh-84px)] space-y-4">
                {historyLoading ? (
                  <p className="text-white/50">{t('loading')}</p>
                ) : historyItems.length === 0 ? (
                  <p className="text-white/50">{t('noAuditRecord')}</p>
                ) : (
                  historyItems.map((item) => (
                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {item.action} by {item.actor?.username || item.actorUserId || 'unknown'}
                          </div>
                          <div className="text-xs text-white/40">
                            {new Intl.DateTimeFormat(locale, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(item.createdAt))}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-md bg-white/10 text-white/60">
                          {t('fieldsCount', { count: item.changedFields.length })}
                        </span>
                      </div>
                      {(item.action === 'UPDATE' || item.action === 'ROLLBACK') && item.before && (
                        <button
                          type="button"
                          onClick={() => rollback(item.id)}
                          className="mb-3 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs hover:bg-amber-500/20"
                        >
                          {t('rollback')}
                        </button>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.changedFields.map((field) => (
                          <span
                            key={field}
                            className="text-xs px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                          >
                            {formatAuditFieldLabel(field)}
                          </span>
                        ))}
                      </div>
                      <details className="text-xs text-white/50">
                        <summary className="cursor-pointer hover:text-white">
                          {t('detailJson')}
                        </summary>
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          <div className="min-w-0">
                            <p className="mb-2 text-red-300">{t('beforeValues')}</p>
                            <AuditSnapshotView
                              value={item.before}
                              comparisonValue={item.after}
                              side="before"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="mb-2 text-green-300">{t('afterValues')}</p>
                            <AuditSnapshotView
                              value={item.after}
                              comparisonValue={item.before}
                              side="after"
                            />
                          </div>
                        </div>
                      </details>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
