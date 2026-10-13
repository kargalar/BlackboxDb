'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAddLogForm } from '../hooks/useAddLogForm';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import Stars from './Stars';
import { DetailedRatingDropdown } from '@/components/molecules/DetailedRatingDropdown';
import { UserSearchInput } from '@/components/molecules/UserSearchInput';
import { FormTagsInput } from '@/components/atoms/FormTagsInput';
import {
  Calendar,
  Clock,
  Gamepad,
  Gamepad2,
  Monitor,
  Smartphone,
  ChevronDown,
  Check,
  Plus,
  Minus,
  Search,
  BookOpen,
  Headphones,
  Tablet,
} from 'lucide-react';

const EMPTY_SUPPORTED_PLATFORMS: Array<{ id: number; name: string }> = [];

const getPlatformIcon = (name: string) => {
  const lowercase = name.toLowerCase();
  if (
    lowercase.includes('pc') ||
    lowercase.includes('windows') ||
    lowercase.includes('mac') ||
    lowercase.includes('steam')
  ) {
    return <Monitor className="w-4 h-4 text-sky-400" />;
  }
  if (lowercase.includes('playstation') || lowercase.includes('ps')) {
    return <Gamepad2 className="w-4 h-4 text-blue-500" />;
  }
  if (lowercase.includes('xbox')) {
    return <Gamepad2 className="w-4 h-4 text-green-500" />;
  }
  if (lowercase.includes('switch') || lowercase.includes('nintendo')) {
    return <Gamepad className="w-4 h-4 text-red-500" />;
  }
  if (
    lowercase.includes('android') ||
    lowercase.includes('ios') ||
    lowercase.includes('phone') ||
    lowercase.includes('mobile')
  ) {
    return <Smartphone className="w-4 h-4 text-teal-400" />;
  }
  return <Gamepad2 className="w-4 h-4 text-neutral-400" />;
};

const BOOK_FORMAT_OPTIONS = [
  { value: 'physical', label: 'Normal Kitap', Icon: BookOpen },
  { value: 'ebook', label: 'E-kitap', Icon: Tablet },
  { value: 'audiobook', label: 'Sesli Kitap', Icon: Headphones },
] as const;

interface AddLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onGlobalUpdate?: () => void;
  contentType: string;
  additionalRatingCategories?: string[];
  initialData?: any;
  contentId?: string;
  supportedPlatforms?: Array<{ id: number; name: string }>;
}

const AddLogDialog: React.FC<AddLogDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  onGlobalUpdate,
  contentType,
  additionalRatingCategories = [],
  initialData,
  contentId,
  supportedPlatforms = EMPTY_SUPPORTED_PLATFORMS,
}) => {
  const t = useTranslations('AddLogDialog');
  const {
    formData,
    setFormData,
    isSaving,
    error,
    availableTags,
    previousTaggedUsers,
    platforms,
    platformSearch,
    setPlatformSearch,
    showPlatformDropdown,
    setShowPlatformDropdown,
    addPlaytime,
    resetPlaytime,
    handleToggleConsumed,
    handleToggleContinuing,
    handleToggleAbandoned,
    handleToggleFavorite,
    handleRatingChange,
    handleSave,
  } = useAddLogForm({
    isOpen,
    initialData,
    contentType,
    contentId,
    supportedPlatforms,
    onSave,
    onClose,
    t,
  });

  const platformDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        platformDropdownRef.current &&
        !platformDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPlatformDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowPlatformDropdown]);
  const getStatusOptions = () => {
    switch (contentType) {
      case 'movie':
        return [
          { id: 1, label: t('statuses.watched') },
          { id: 2, label: t('statuses.watching') },
          { id: 3, label: t('statuses.toWatch') },
        ];
      case 'tv':
        return [
          { id: 1, label: t('statuses.watched') },
          { id: 2, label: t('statuses.watching') },
          { id: 3, label: t('statuses.toWatch') },
        ];
      case 'book':
        return [
          { id: 1, label: t('statuses.read') },
          { id: 2, label: t('statuses.reading') },
          { id: 3, label: t('statuses.toRead') },
        ];
      case 'game':
        return [
          { id: 1, label: t('statuses.played') },
          { id: 2, label: t('statuses.playing') },
          { id: 3, label: t('statuses.toPlay') },
        ];
      default:
        return [
          { id: 1, label: t('statuses.completed') },
          { id: 2, label: t('statuses.continuing') },
          { id: 3, label: t('statuses.planned') },
        ];
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-neutral-950 rounded-xl border border-neutral-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <svg
                className="w-6 h-6 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('title')}
            </h3>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div
              className={
                contentType === 'game' || contentType === 'book'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'w-full'
              }
            >
              {/* Tarih */}
              <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800 flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  {t('recordDate')}
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="bg-neutral-900/50 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-700 focus:border-neutral-700 transition-all duration-200 text-sm cursor-pointer w-full"
                />
              </div>

              {/* Oyun için Platform */}
              {contentType === 'game' && (
                <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800 flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-neutral-500" />
                    {t('platform')}
                  </label>

                  <div className="relative w-full" ref={platformDropdownRef}>
                    <button
                      type="button"
                      disabled={platforms.length === 0}
                      onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm text-neutral-300 hover:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        {formData.platformId ? (
                          <>
                            {getPlatformIcon(
                              platforms.find((p) => p.id === formData.platformId)?.name || ''
                            )}
                            <span className="font-medium text-neutral-200">
                              {platforms.find((p) => p.id === formData.platformId)?.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <Gamepad2 className="w-4 h-4 text-neutral-500" />
                            <span className="text-neutral-500">{t('selectPlatform')}</span>
                          </>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showPlatformDropdown ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showPlatformDropdown && (
                      <div className="absolute top-full left-0 mt-1.5 w-full bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl z-50 p-1.5 max-h-64 overflow-y-auto">
                        {platforms.length > 6 && (
                          <div className="flex items-center gap-2 px-2 py-1 mb-1 border-b border-neutral-800">
                            <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <input
                              type="text"
                              placeholder="Platform ara..."
                              value={platformSearch}
                              onChange={(e) => setPlatformSearch(e.target.value)}
                              className="w-full bg-transparent border-none text-xs text-neutral-300 focus:outline-none focus:ring-0 p-0"
                            />
                          </div>
                        )}

                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, platformId: null }));
                              setShowPlatformDropdown(false);
                              setPlatformSearch('');
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200 transition-colors text-left ${
                              formData.platformId === null
                                ? 'bg-neutral-900/60 text-white font-medium'
                                : ''
                            }`}
                          >
                            <span>{t('clearSelection')}</span>
                            {formData.platformId === null && (
                              <Check className="w-3.5 h-3.5 text-neutral-400" />
                            )}
                          </button>

                          {platforms.filter((p) =>
                            p.name.toLowerCase().includes(platformSearch.toLowerCase())
                          ).length > 0 ? (
                            platforms
                              .filter((p) =>
                                p.name.toLowerCase().includes(platformSearch.toLowerCase())
                              )
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, platformId: p.id }));
                                    setShowPlatformDropdown(false);
                                    setPlatformSearch('');
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm text-neutral-300 hover:bg-neutral-900 transition-colors text-left ${
                                    formData.platformId === p.id
                                      ? 'bg-neutral-900 text-white font-semibold'
                                      : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {getPlatformIcon(p.name)}
                                    <span>{p.name}</span>
                                  </div>
                                  {formData.platformId === p.id && (
                                    <Check className="w-4 h-4 text-violet-400" />
                                  )}
                                </button>
                              ))
                          ) : (
                            <div className="px-2.5 py-2 text-xs text-neutral-500">
                              {t('platformNotFound')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contentType === 'book' &&
                (formData.is_consumed || formData.is_continuing || formData.is_abandoned) && (
                  <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800 flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-neutral-500" />
                      {t('readingFormat')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {BOOK_FORMAT_OPTIONS.map(({ value, label, Icon }) => {
                        const active = formData.bookFormat === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                bookFormat: active ? null : value,
                              }))
                            }
                            className={`flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                              active
                                ? 'border-violet-500 bg-violet-500/15 text-violet-100'
                                : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* Oyun için Oynama Süresi */}
            {contentType === 'game' && (
              <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800 flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-neutral-500" />
                  {t('playtime')}
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                  <div className="flex items-center gap-4">
                    {/* Saat Kontrolü */}
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                        {t('hours')}
                      </span>
                      <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-neutral-700 transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => {
                            const currentHours = Math.floor(
                              (Number(formData.playtime_minutes) || 0) / 60
                            );
                            if (currentHours > 0) {
                              const currentMinutes = (Number(formData.playtime_minutes) || 0) % 60;
                              const total = (currentHours - 1) * 60 + currentMinutes;
                              setFormData((prev) => ({
                                ...prev,
                                playtime_minutes: total > 0 ? total : '',
                              }));
                            }
                          }}
                          className="px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={
                            formData.playtime_minutes
                              ? Math.floor(Number(formData.playtime_minutes) / 60)
                              : ''
                          }
                          onChange={(e) => {
                            const newHours = Math.max(0, parseInt(e.target.value) || 0);
                            const currentMinutes = (Number(formData.playtime_minutes) || 0) % 60;
                            const total = newHours * 60 + currentMinutes;
                            setFormData((prev) => ({
                              ...prev,
                              playtime_minutes: total > 0 ? total : '',
                            }));
                          }}
                          placeholder="0"
                          className="w-12 bg-transparent border-none text-center font-bold text-lg text-white focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const currentHours = Math.floor(
                              (Number(formData.playtime_minutes) || 0) / 60
                            );
                            const currentMinutes = (Number(formData.playtime_minutes) || 0) % 60;
                            const total = (currentHours + 1) * 60 + currentMinutes;
                            setFormData((prev) => ({ ...prev, playtime_minutes: total }));
                          }}
                          className="px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Ayraç */}
                    <div className="text-neutral-700 font-bold text-xl self-end mb-1">:</div>

                    {/* Dakika Kontrolü */}
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                        {t('minutes')}
                      </span>
                      <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-neutral-700 transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => {
                            const currentMinutes = (Number(formData.playtime_minutes) || 0) % 60;
                            if (currentMinutes > 0) {
                              const currentHours = Math.floor(
                                (Number(formData.playtime_minutes) || 0) / 60
                              );
                              const total = currentHours * 60 + (currentMinutes - 1);
                              setFormData((prev) => ({
                                ...prev,
                                playtime_minutes: total > 0 ? total : '',
                              }));
                            }
                          }}
                          className="px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={
                            formData.playtime_minutes ? Number(formData.playtime_minutes) % 60 : ''
                          }
                          onChange={(e) => {
                            const newMinutes = Math.min(
                              59,
                              Math.max(0, parseInt(e.target.value) || 0)
                            );
                            const currentHours = Math.floor(
                              (Number(formData.playtime_minutes) || 0) / 60
                            );
                            const total = currentHours * 60 + newMinutes;
                            setFormData((prev) => ({
                              ...prev,
                              playtime_minutes: total > 0 ? total : '',
                            }));
                          }}
                          placeholder="0"
                          className="w-12 bg-transparent border-none text-center font-bold text-lg text-white focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const currentMinutes = (Number(formData.playtime_minutes) || 0) % 60;
                            const currentHours = Math.floor(
                              (Number(formData.playtime_minutes) || 0) / 60
                            );
                            const total = currentHours * 60 + (currentMinutes + 1);
                            setFormData((prev) => ({ ...prev, playtime_minutes: total }));
                          }}
                          className="px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Hızlı Ekleme ve Sıfırlama */}
                  <div className="flex flex-col items-end gap-2.5">
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => addPlaytime(30)}
                        className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition-all font-medium hover:border-neutral-700 active:scale-95"
                      >
                        +30 dk
                      </button>
                      <button
                        type="button"
                        onClick={() => addPlaytime(60)}
                        className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition-all font-medium hover:border-neutral-700 active:scale-95"
                      >
                        +1 sa
                      </button>
                      <button
                        type="button"
                        onClick={() => addPlaytime(120)}
                        className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition-all font-medium hover:border-neutral-700 active:scale-95"
                      >
                        +2 sa
                      </button>
                      <button
                        type="button"
                        onClick={() => addPlaytime(300)}
                        className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition-all font-medium hover:border-neutral-700 active:scale-95"
                      >
                        +5 sa
                      </button>
                    </div>
                    {formData.playtime_minutes ? (
                      <button
                        type="button"
                        onClick={resetPlaytime}
                        className="text-[11px] text-red-400 hover:text-red-300 transition-colors font-medium cursor-pointer"
                      >
                        {t('resetTime')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              {/* 3 Ana Buton */}
              <div className="flex-1 bg-neutral-900/30 rounded-xl p-4 border border-neutral-800 flex flex-col justify-center">
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={handleToggleConsumed}
                    className={`relative flex items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 group hover:scale-105 ${
                      formData.is_consumed
                        ? 'bg-[#22C55E] text-white border-2 border-[#16A34A] shadow-lg shadow-[#22C55E]/50'
                        : 'bg-neutral-800/40 text-neutral-400 border border-transparent hover:bg-neutral-800 hover:text-neutral-300'
                    }`}
                    title="İzlendi"
                  >
                    <div
                      className={`transition-transform duration-300 ${
                        formData.is_consumed ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </div>

                    {/* Active indicator */}
                    {formData.is_consumed && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#4ADE80] rounded-full border border-[#22C55E] flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-[#0B0D14]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    className={`relative flex items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 group hover:scale-105 ${
                      formData.is_favorite
                        ? 'bg-red-600 text-white border-2 border-red-500 shadow-lg shadow-red-900/50'
                        : 'bg-neutral-800/40 text-neutral-400 border border-transparent hover:bg-neutral-800 hover:text-neutral-300'
                    }`}
                    title="Favori"
                  >
                    <div
                      className={`transition-transform duration-300 ${
                        formData.is_favorite ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>

                    {/* Active indicator */}
                    {formData.is_favorite && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border border-red-400 flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_consume_later: !prev.is_consume_later }))
                    }
                    className={`relative flex items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 group hover:scale-105 ${
                      formData.is_consume_later
                        ? 'bg-blue-600 text-white border-2 border-blue-500 shadow-lg shadow-blue-900/50'
                        : 'bg-neutral-800/40 text-neutral-400 border border-transparent hover:bg-neutral-800 hover:text-neutral-300'
                    }`}
                    title="Sonra İzle"
                  >
                    <div
                      className={`transition-transform duration-300 ${
                        formData.is_consume_later ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>

                    {/* Active indicator */}
                    {formData.is_consume_later && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full border border-blue-400 flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Devam Ediyor Butonu */}
                  {contentType !== 'movie' && (
                    <button
                      onClick={handleToggleContinuing}
                      className={`relative flex items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 group hover:scale-105 ${
                        formData.is_continuing
                          ? 'bg-purple-600 text-white border-2 border-purple-500 shadow-lg shadow-purple-900/50'
                          : 'bg-neutral-800/40 text-neutral-400 border border-transparent hover:bg-neutral-800 hover:text-neutral-300'
                      }`}
                      title="Devam Ediyor"
                    >
                      <div
                        className={`transition-transform duration-300 ${formData.is_continuing ? 'scale-110' : 'group-hover:scale-110'}`}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      {/* Active indicator */}
                      {formData.is_continuing && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full border border-purple-400 flex items-center justify-center">
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="square"
                              strokeLinejoin="miter"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  )}

                  {/* Yarıda Bıraktım Butonu */}
                  {contentType !== 'movie' && (
                    <button
                      onClick={handleToggleAbandoned}
                      className={`relative flex items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 group hover:scale-105 ${
                        formData.is_abandoned
                          ? 'bg-[#EF4444] text-white border-2 border-[#DC2626] shadow-lg shadow-[#EF4444]/50'
                          : 'bg-neutral-800/40 text-neutral-400 border border-transparent hover:bg-neutral-800 hover:text-neutral-300'
                      }`}
                      title="Yarıda Bıraktım"
                    >
                      <div
                        className={`transition-transform duration-300 ${formData.is_abandoned ? 'scale-110' : 'group-hover:scale-110'}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                      </div>
                      {/* Active indicator */}
                      {formData.is_abandoned && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#F87171] rounded-full border border-[#EF4444] flex items-center justify-center">
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="square"
                              strokeLinejoin="miter"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  )}
                </div>
                <div className="mt-4 text-center text-xs text-neutral-500 font-medium">
                  {formData.is_consumed && t('statuses.watched')}
                  {formData.is_continuing && t('statuses.continuing')}
                  {formData.is_abandoned && t('statuses.abandoned')}
                  {formData.is_favorite && ` • ${t('statuses.favorite')}`}
                  {formData.is_consume_later && ` • ${t('statuses.watchLater')}`}
                  {!formData.is_consumed &&
                    !formData.is_favorite &&
                    !formData.is_consume_later &&
                    !formData.is_continuing &&
                    !formData.is_abandoned &&
                    t('statuses.noStatus')}
                </div>
              </div>

              {/* Puan */}
              <div className="flex-1 bg-neutral-900/30 rounded-xl p-4 border border-neutral-800 flex flex-col justify-center items-center">
                <label className="text-xs uppercase tracking-wider font-semibold text-neutral-500 mb-3">
                  {t('rating.title')}
                </label>
                <Stars size="md" value={formData.rating} onChange={handleRatingChange} />
                <div className="mt-3 text-xs text-neutral-500 text-center uppercase tracking-widest min-h-[16px]">
                  {formData.rating > 0 ? (
                    <span className="text-neutral-300 font-bold">{formData.rating}/10</span>
                  ) : (
                    t('rating.unrated')
                  )}
                </div>
                <div className="w-full mt-2">
                  <DetailedRatingDropdown
                    type={contentType}
                    additionalCategories={additionalRatingCategories}
                    ratingDetails={formData.ratingDetails}
                    onChange={(details) =>
                      setFormData((prev) => ({ ...prev, ratingDetails: details }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* İnceleme (Opsiyonel) */}
            <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800">
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                {t('review')}
              </label>
              <textarea
                value={formData.review}
                onChange={(e) => setFormData((prev) => ({ ...prev, review: e.target.value }))}
                placeholder={t('reviewPlaceholder')}
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-3 py-3 text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-600 focus:border-neutral-600 transition-all duration-200 text-sm resize-y min-h-[80px]"
              />
            </div>
            {/* Etiketler (Format vb) */}
            <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800">
              <FormTagsInput
                label={t('tags')}
                name="tags"
                value={formData.tags}
                onChange={(val) => setFormData((prev) => ({ ...prev, tags: val }))}
                placeholder={t('tagsPlaceholder')}
                suggestedTags={availableTags}
                onGlobalDelete={onGlobalUpdate}
              />
              <p className="text-xs text-neutral-500 mt-2">{t('tagsHelper')}</p>
            </div>

            {/* Kullanıcı Etiketleme (Opsiyonel) */}
            <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800">
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                {t('withWho')}
              </label>
              <UserSearchInput
                selectedUsers={formData.taggedUsersObj}
                previousTaggedUsers={previousTaggedUsers}
                allowCustom={true}
                onGlobalDelete={onGlobalUpdate}
                onUserAdd={(user) => {
                  setFormData((prev) => ({
                    ...prev,
                    taggedUsersObj: [...prev.taggedUsersObj, user],
                  }));
                }}
                onUserRemove={(userId) => {
                  setFormData((prev) => ({
                    ...prev,
                    taggedUsersObj: prev.taggedUsersObj.filter((u: any) => u.id !== userId),
                  }));
                }}
              />
            </div>
            {/* Hata mesajı */}
            {error && (
              <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Butonlar */}
            <div className="flex gap-3 pt-4 border-t border-neutral-800">
              <button
                onClick={onClose}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 px-4 py-3 rounded-xl transition-colors font-medium border border-neutral-700"
                disabled={isSaving}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-neutral-100 hover:bg-white disabled:bg-neutral-300 disabled:cursor-not-allowed text-neutral-900 px-4 py-3 rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t('save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default AddLogDialog;
