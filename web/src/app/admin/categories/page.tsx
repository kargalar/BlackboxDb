'use client';

/**
 * Categories admin page — orchestrates form, list, and tab navigation.
 * Single Responsibility: page layout and wiring sub-components to the hook.
 */

import { type TabType, TAB_CONFIG } from './categoriesTypes';
import { useCategoriesData } from './useCategoriesData';
import CategoryForm from './CategoryForm';
import CategoryList from './CategoryList';
import { useTranslations } from 'next-intl';

export default function CategoriesPage() {
  const {
    allowed,
    activeTab,
    items,
    loading,
    editingId,
    formData,
    message,
    genreContentTypeFilter,
    pendingProfileRef,
    hasMore,
    isLoadingMore,
    searchQuery,
    totalCount,
    setFormData,
    setGenreContentTypeFilter,
    handleTabChange,
    handleSave,
    handleEdit,
    handleDelete,
    handleCancelEdit,
    getItemDisplayName,
    loadMore,
    handleSearch,
    handleSortChange,
    sortBy,
    sortOrder,
  } = useCategoriesData();
  const t = useTranslations('AdminCategoriesPage');

  console.log(`🏠 [CategoriesPage] Render — tab=${activeTab}, allowed=${allowed}`);

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
            className={`px-4 py-2 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-2">
        {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {TAB_CONFIG[tab].icon} {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Form */}
      <CategoryForm
        activeTab={activeTab}
        editingId={editingId}
        formData={formData}
        loading={loading}
        pendingProfileRef={pendingProfileRef}
        onFormDataChange={setFormData}
        onSave={handleSave}
        onCancel={handleCancelEdit}
      />

      {/* List */}
      <CategoryList
        activeTab={activeTab}
        items={items}
        loading={loading}
        genreContentTypeFilter={genreContentTypeFilter}
        onGenreFilterChange={setGenreContentTypeFilter}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getItemDisplayName={getItemDisplayName}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        totalCount={totalCount}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
