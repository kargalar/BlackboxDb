'use client';

import { Suspense } from 'react';
import { useAddContentForm } from './hooks/useAddContentForm';
import { useAddContentSubmit } from './hooks/useAddContentSubmit';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ContentTypeSelector } from './components/ContentTypeSelector';
import { ContentFormLayout } from './components/ContentFormLayout';
import { BulkAddInterface } from './components/BulkAddInterface';
import { useTranslations } from 'next-intl';

export default function AddContentPage() {
  const t = useTranslations('AddContent');
  return (
    <Suspense fallback={<div className="p-6">{t('loading')}</div>}>
      <AddContentPageInner />
    </Suspense>
  );
}

function AddContentPageInner() {
  const t = useTranslations('AddContent');
  const {
    user,
    loading,
    setLoading,
    uploadProgress,
    setUploadProgress,
    errors,
    isEditMode,
    contentId,
    requestId,
    formData,
    setFormData,
    pendingPoster,
    pendingBackdrop,
    setPendingPoster,
    setPendingBackdrop,
    resetForm,
    canDirectCreate,
    validateForm,
    isBulkMode,
    setIsBulkMode,
    contributionId,
    contributionStatus,
    originalData,
  } = useAddContentForm();

  const { handleSubmit } = useAddContentSubmit({
    formData,
    pendingPoster,
    pendingBackdrop,
    resetForm,
    isEditMode,
    contentId,
    requestId,
    contributionId,
    contributionStatus,
    canDirectCreate,
    originalData,
    setLoading,
    setUploadProgress,
    validateForm,
  });

  console.log('🏠 [AddContentPage] Render:', {
    isEditMode,
    contentTypeId: formData.contentTypeId,
    loading,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
            <span className="text-3xl">👤</span>
          </div>
          <h1 className="text-xl font-bold mb-2">{t('loginRequired.title')}</h1>
          <p className="text-white/50">{t('loginRequired.description')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Loading Overlay */}
      {loading && <LoadingOverlay uploadProgress={uploadProgress} />}

      <div className="space-y-6">
        {/* Normal kullanıcı için bilgi mesajı */}
        {!canDirectCreate && (
          <div className="glass-card p-4 border border-yellow-500/30 bg-yellow-500/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-400 mb-1">{t('requestInfo.title')}</h3>
                <p className="text-sm text-white/60">{t('requestInfo.description')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header and Bulk Mode Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">
              {isEditMode
                ? t('headers.edit')
                : canDirectCreate
                  ? t('headers.add')
                  : t('headers.request')}
            </span>
          </h1>
          {!isEditMode && user?.isAdmin && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-300">{t('headers.bulkMode')}</span>
              <button
                type="button"
                onClick={() => setIsBulkMode(!isBulkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isBulkMode ? 'bg-violet-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isBulkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Form or Bulk Interface */}
        {isBulkMode ? (
          <div className="glass-card border border-gray-700 rounded-2xl p-6 space-y-6">
            <ContentTypeSelector formData={formData} setFormData={setFormData} errors={errors} />
            {formData.contentTypeId && <BulkAddInterface contentTypeId={formData.contentTypeId} />}
          </div>
        ) : (
          <form
            id="add-content-form"
            onSubmit={handleSubmit}
            className="glass-card border border-gray-700 rounded-2xl p-6 space-y-6"
          >
            {/* Content Type Selection - Only in Add mode */}
            {!isEditMode && (
              <ContentTypeSelector formData={formData} setFormData={setFormData} errors={errors} />
            )}

            {/* Content Fields Layout */}
            {formData.contentTypeId && (
              <ContentFormLayout
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                loading={loading}
                editingContentId={contentId}
                canDirectCreate={canDirectCreate}
                enableTitleAutoFill={!requestId}
                originalData={originalData}
                onPendingPosterChange={(pending) => {
                  setPendingPoster(pending);
                }}
                onPendingBackdropChange={(pending) => {
                  setPendingBackdrop(pending);
                }}
              />
            )}
            <div className="pb-20" />
          </form>
        )}
      </div>

      {/* Floating Save Button */}
      {!isBulkMode && (
        <button
          type="submit"
          form="add-content-form"
          disabled={loading || !formData.contentTypeId}
          className="fixed bottom-6 right-6 z-50 px-6 py-3 bg-green-600 text-white font-semibold rounded-full shadow-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all"
        >
          {loading
            ? t('buttons.saving')
            : isEditMode
              ? t('buttons.saveUpdates')
              : canDirectCreate
                ? t('buttons.addContent')
                : t('buttons.sendRequest')}
        </button>
      )}
    </div>
  );
}
