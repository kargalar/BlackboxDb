'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

/**
 * Reusable expansion section UI component (DLC or Remake).
 * Single Responsibility: Renders expansion form, image upload, and item list.
 */

import Image from 'next/image';
import Link from 'next/link';
import { Upload, X } from 'lucide-react';
import { ExpansionConfig, ExpansionItem } from './GameFieldsTypes';
import type { ExpansionStateReturn } from './useExpansionState';

interface ExpansionSectionProps {
  config: ExpansionConfig;
  state: ExpansionStateReturn;
}

export function ExpansionSection({ config, state }: ExpansionSectionProps) {
  const translateUi = useUiTranslations('Ui');
  const {
    newItem,
    setNewItem,
    showForm,
    setShowForm,
    editingIndex,
    isDragging,
    fileInputRef,
    filteredExpansions,
    handleAdd,
    handleEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleRemove,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
  } = state;

  const isDlc = config.type === 'expansion';

  console.log(
    `🎮 [ExpansionSection:${config.type.toUpperCase()}] Render - items: ${filteredExpansions.length}`
  );

  return (
    <div className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <span className="text-sm">{config.icon}</span>
          <span>{config.label}</span>
        </label>
        <button
          type="button"
          onClick={() => {
            if (showForm && editingIndex !== null) {
              handleCancelEdit();
            } else {
              setShowForm(!showForm);
            }
          }}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            isDlc
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
              : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/30'
          }`}
        >
          {showForm ? translateUi("iptal_ed41a6f") : config.newButtonLabel}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* New/Edit Form */}
      {showForm && (
        <div
          className={`p-4 rounded-xl bg-white dark:bg-surface-raised border space-y-3 ${
            isDlc
              ? 'border-gray-200 dark:border-gray-700'
              : 'border-amber-200 dark:border-amber-900/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {editingIndex !== null ? config.editLabel : config.addNewLabel}
            </span>
          </div>
          <input
            type="text"
            placeholder={config.namePlaceholder}
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <textarea
            placeholder={translateUi("aciklama_opsiyonel_2bc107e")}
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="date"
            placeholder={translateUi("cikis_tarihi_14a6568")}
            value={newItem.releaseDate}
            onChange={(e) => setNewItem({ ...newItem, releaseDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          {/* Image Upload with Drag & Drop */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {translateUi("kapak_gorseli_032958c")}
            </label>
            {newItem.posterUrl ? (
              <div className="relative w-20 h-28 rounded overflow-hidden group">
                <Image
                  src={newItem.posterUrl}
                  alt={translateUi("value1_poster_047e6a1", { value1: String(config.type.toUpperCase()) })}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    title={translateUi("degistir_ddc61e1")}
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewItem({ ...newItem, posterUrl: '' })}
                    className="p-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    title={translateUi("kaldir_d38bc7b")}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                  ${
                    isDragging
                      ? isDlc
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-amber-500 bg-amber-500/10'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }
                `}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-xs text-gray-400 dark:text-gray-500">{translateUi("surukle_birak_veya_tikla_f0c5e37")}</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                  {translateUi("2_3_oraninda_kirpilacak_5a26bc3")}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {editingIndex !== null ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!newItem.name.trim()}
                  className="flex-1 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {translateUi("kaydet_3d5e0fa")}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-2 rounded bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  {translateUi("iptal_85e2d08")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newItem.name.trim()}
                className={`w-full py-2 rounded text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  isDlc ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {config.addButtonLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Item List */}
      {filteredExpansions.length > 0 && (
        <div className="space-y-2">
          {filteredExpansions.map((expansion: ExpansionItem, idx: number) => (
            <div
              key={`${config.type}-${idx}`}
              className={`flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-surface-raised border ${
                isDlc
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-amber-200 dark:border-amber-900/30'
              }`}
            >
              {expansion.posterUrl && (
                <div className="relative w-12 h-16 flex-shrink-0 rounded overflow-hidden">
                  <Image
                    src={expansion.posterUrl}
                    alt={expansion.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {expansion.detailContentId ? (
                  <Link
                    href={`/content/board-game/${expansion.detailContentId}`}
                    className="block truncate text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
                  >
                    {expansion.name}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {expansion.name}
                  </p>
                )}
                {expansion.releaseDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    📅 {expansion.releaseDate}
                  </p>
                )}
                {expansion.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                    {expansion.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(expansion)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-violet-500 transition-colors"
                  title={translateUi("duzenle_525fd6f")}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(expansion)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  title={translateUi("sil_353ad5e")}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredExpansions.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
          {config.emptyMessage}
        </p>
      )}
    </div>
  );
}
