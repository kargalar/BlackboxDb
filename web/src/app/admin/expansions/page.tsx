'use client';

/**
 * Expansions admin page — manages DLCs and expansion packs.
 * SRP: page layout and wiring sub-components to the custom hook.
 */

import { useExpansionsData } from './useExpansionsData';
import ExpansionForm from './ExpansionForm';
import ExpansionList from './ExpansionList';
import { useTranslations } from 'next-intl';

export default function ExpansionsPage() {
  const {
    allowed,
    items,
    loading,
    editing,
    formData,
    message,
    search,
    typeFilter,
    contentSearch,
    contentResults,
    searchingContent,
    setSearch,
    setTypeFilter,
    setFormData,
    setContentSearch,
    handleLoad,
    handleCreate,
    handleStartEdit,
    handleSave,
    handleDelete,
    handleCancelEdit,
    handleSelectContent,
    pendingPosterRef,
  } = useExpansionsData();
  const t = useTranslations('AdminExpansionsPage');

  console.log(`🎮 [ExpansionsPage] Render — allowed=${allowed}, items=${items.length}`);

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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {message && (
          <div
            className={`px-4 py-2 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Form */}
      <ExpansionForm
        editing={editing}
        formData={formData}
        loading={loading}
        contentSearch={contentSearch}
        contentResults={contentResults}
        searchingContent={searchingContent}
        pendingPosterRef={pendingPosterRef}
        onFormDataChange={setFormData}
        onContentSearchChange={setContentSearch}
        onSelectContent={handleSelectContent}
        onCreate={handleCreate}
        onSave={handleSave}
        onCancel={handleCancelEdit}
      />

      {/* Filters + List */}
      <ExpansionList
        items={items}
        loading={loading}
        search={search}
        typeFilter={typeFilter}
        onSearchChange={setSearch}
        onTypeFilterChange={setTypeFilter}
        onSearch={handleLoad}
        onEdit={handleStartEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
