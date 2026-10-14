'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Sparkles, ChevronUp, ChevronDown, Trash2, Plus, Search, Check, Save } from 'lucide-react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import {
  GET_EDITOR_PICKS,
  SET_EDITOR_PICKS,
  type EditorPick,
} from '@/services/graphql/editorPicks';
import { SEARCH_CONTENT_MINIMAL } from '@/services/graphql/content';

const CONTENT_TYPES = [
  { id: 1, name: 'Film', icon: '🎬' },
  { id: 2, name: 'Dizi', icon: '📺' },
  { id: 3, name: 'Oyun', icon: '🎮' },
  { id: 4, name: 'Kitap', icon: '📚' },
  { id: 5, name: 'Müzik', icon: '🎵' },
];

const QUICK_BADGES: Record<number, string[]> = {
  1: ['Günün Filmi', 'Haftanın Filmi', 'Editörün Seçimi', 'Kült Klasik', 'Sinema Şaheseri'],
  2: ['Günün Dizisi', 'Haftanın Dizisi', 'Editörün Seçimi', 'Hafta Sonu Maratonu', 'Mini Dizi'],
  3: ['Günün Oyunu', 'Haftanın Oyunu', 'Editörün Seçimi', 'Bağımsız Cevher', 'Başyapıt'],
  4: ['Günün Kitabı', 'Haftanın Kitabı', 'Editörün Seçimi', 'Başucu Kitabı', 'Modern Klasik'],
  5: ['Günün Albümü', 'Haftanın Albümü', 'Editörün Seçimi', 'Günün Şarkısı', 'Keşif'],
};

interface LocalPickItem {
  contentId: string;
  label: string;
  displayOrder: number;
  content: {
    id: string;
    title: string;
    releaseDate?: string | null;
    posterUrl?: string | null;
    backdropUrl?: string | null;
  };
}

export default function AdminShowcasePage() {
  const { user, isPrivileged } = useAuth();
  const t = useTranslations('AdminShowcase');

  const [activeTypeId, setActiveTypeId] = useState<number>(1);
  const [localPicks, setLocalPicks] = useState<LocalPickItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load existing editor picks for active content type
  const { data, loading: picksLoading, refetch } = useQuery<{ editorPicks: EditorPick[] }>(GET_EDITOR_PICKS, {
    variables: { contentTypeId: activeTypeId },
    fetchPolicy: 'network-only',
  });

  const [setEditorPicksMutation, { loading: isSaving }] = useMutation(SET_EDITOR_PICKS);

  // Lazy query for searching content
  const [searchContent, { data: searchData, loading: isSearching }] = useLazyQuery<{
    searchContent: {
      items: Array<{
        id: string;
        title: string;
        releaseDate?: string;
        posterUrl?: string;
        backdropUrl?: string;
      }>;
    };
  }>(SEARCH_CONTENT_MINIMAL);

  // Sync local picks when backend query returns
  useEffect(() => {
    if (data?.editorPicks) {
      setLocalPicks(
        data.editorPicks.map((pick, idx) => ({
          contentId: pick.contentId,
          label: pick.label || QUICK_BADGES[activeTypeId]?.[0] || 'Editörün Seçimi',
          displayOrder: idx,
          content: pick.content || { id: pick.contentId, title: 'İçerik #' + pick.contentId },
        }))
      );
    } else {
      setLocalPicks([]);
    }
    setSaveStatus(null);
  }, [data, activeTypeId]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchContent({
        variables: {
          searchQuery: debouncedSearch,
          contentTypeId: activeTypeId,
          limit: 8,
        },
      });
    }
  }, [debouncedSearch, activeTypeId, searchContent]);

  if (!user || !isPrivileged) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Erişim Reddedildi</h1>
          <p className="text-white/50">Bu sayfaya erişmek için editör veya yönetici olmanız gerekir.</p>
        </div>
      </div>
    );
  }

  const handleAddPick = (item: { id: string; title: string; releaseDate?: string; posterUrl?: string }) => {
    if (localPicks.length >= 5) {
      setSaveStatus({ type: 'error', message: t('maxReached') });
      return;
    }
    if (localPicks.some((p) => p.contentId === item.id)) {
      return;
    }

    const nextOrder = localPicks.length;
    const defaultLabel = QUICK_BADGES[activeTypeId]?.[nextOrder] || 'Editörün Seçimi';

    setLocalPicks([
      ...localPicks,
      {
        contentId: item.id,
        label: defaultLabel,
        displayOrder: nextOrder,
        content: item,
      },
    ]);
    setSearchTerm('');
    setSaveStatus(null);
  };

  const handleRemovePick = (contentId: string) => {
    setLocalPicks((prev) =>
      prev
        .filter((p) => p.contentId !== contentId)
        .map((p, idx) => ({ ...p, displayOrder: idx }))
    );
    setSaveStatus(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localPicks.length) return;

    const updated = [...localPicks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setLocalPicks(updated.map((item, idx) => ({ ...item, displayOrder: idx })));
    setSaveStatus(null);
  };

  const handleLabelChange = (index: number, label: string) => {
    setLocalPicks((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, label } : item))
    );
    setSaveStatus(null);
  };

  const handleSave = async () => {
    try {
      setSaveStatus(null);
      await setEditorPicksMutation({
        variables: {
          contentTypeId: activeTypeId,
          picks: localPicks.map((p, idx) => ({
            contentId: p.contentId,
            label: p.label.trim() || 'Editörün Seçimi',
            displayOrder: idx,
          })),
        },
      });
      await refetch();
      setSaveStatus({ type: 'success', message: t('savedSuccess') });
    } catch (err: any) {
      console.error('Failed to save editor picks:', err);
      setSaveStatus({ type: 'error', message: err.message || t('saveError') });
    }
  };

  const currentType = CONTENT_TYPES.find((t) => t.id === activeTypeId);
  const searchResults = searchData?.searchContent?.items || [];

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('title')}</h1>
            </div>
            <p className="text-sm text-white/50 mt-1">{t('description')}</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-gradient inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-purple-500/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? t('saving') : t('save')}
        </button>
      </div>

      {/* Notifications */}
      {saveStatus && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            saveStatus.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          <span>{saveStatus.message}</span>
          <button onClick={() => setSaveStatus(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Content Type Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5">
        {CONTENT_TYPES.map((type) => {
          const isActive = type.id === activeTypeId;
          return (
            <button
              key={type.id}
              onClick={() => {
                setActiveTypeId(type.id);
                setSearchTerm('');
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{type.icon}</span>
              <span>{type.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Selected Picks (Left) + Search & Add (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Selected Picks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>{currentType?.icon}</span>
              <span>{currentType?.name} Vitrini</span>
            </h2>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                localPicks.length === 5
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {localPicks.length} / 5 İçerik
            </span>
          </div>

          {picksLoading ? (
            <div className="p-8 text-center text-white/40">Yükleniyor...</div>
          ) : localPicks.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/15 text-center space-y-2">
              <p className="text-white/60 font-medium">{t('noItems')}</p>
              <p className="text-xs text-white/40">
                Sağdaki arama alanını kullanarak {currentType?.name?.toLowerCase()} arayın ve vitrine ekleyin (en fazla 5 adet).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {localPicks.map((pick, idx) => {
                const year = pick.content.releaseDate
                  ? new Date(pick.content.releaseDate).getFullYear()
                  : '';
                return (
                  <div
                    key={pick.contentId}
                    className="p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Order Index & Reorder Controls */}
                      <div className="flex flex-col items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                          title={t('moveUp')}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-white/60 w-5 text-center">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === localPicks.length - 1}
                          className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                          title={t('moveDown')}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Poster */}
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 relative flex-shrink-0">
                        {pick.content.posterUrl ? (
                          <Image
                            src={pick.content.posterUrl}
                            alt={pick.content.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/20">
                            {currentType?.icon}
                          </div>
                        )}
                      </div>

                      {/* Title & Badge Input */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-semibold text-white truncate text-sm">
                            {pick.content.title}
                          </h3>
                          {year && (
                            <span className="text-xs text-white/40">({year})</span>
                          )}
                        </div>

                        {/* Label Badge Input */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] flex-shrink-0" />
                          <input
                            type="text"
                            value={pick.label}
                            onChange={(e) => handleLabelChange(idx, e.target.value)}
                            placeholder={t('badgePlaceholder')}
                            className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePick(pick.contentId)}
                        className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={t('remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Badge Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pl-8">
                      <span className="text-[10px] text-white/30 uppercase tracking-wider mr-1">
                        Rozet:
                      </span>
                      {QUICK_BADGES[activeTypeId]?.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleLabelChange(idx, chip)}
                          className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                            pick.label === chip
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Content Search & Add */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              <span>{t('addContent')}</span>
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Veritabanından {currentType?.name?.toLowerCase()} arayarak vitrine ekleyin.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              disabled={localPicks.length >= 5}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-500 disabled:opacity-40"
            />
          </div>

          {/* Search Results */}
          {localPicks.length >= 5 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center">
              Maksimum 5 adet içerik sınırına ulaşıldı. Yeni içerik eklemek için mevcutlardan birini kaldırabilirsiniz.
            </div>
          ) : isSearching ? (
            <div className="p-6 text-center text-xs text-white/40">Aranıyor...</div>
          ) : debouncedSearch.length >= 2 && searchResults.length === 0 ? (
            <div className="p-6 text-center text-xs text-white/40">Sonuç bulunamadı.</div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {searchResults.map((item) => {
                const isSelected = localPicks.some((p) => p.contentId === item.id);
                const year = item.releaseDate
                  ? new Date(item.releaseDate).getFullYear()
                  : '';
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-14 rounded-md overflow-hidden bg-white/5 relative flex-shrink-0">
                        {item.posterUrl ? (
                          <Image
                            src={item.posterUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/20">
                            {currentType?.icon}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {item.title}
                        </h4>
                        {year && (
                          <p className="text-xs text-white/40">{year}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleAddPick(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Eklendi</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ekle</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

