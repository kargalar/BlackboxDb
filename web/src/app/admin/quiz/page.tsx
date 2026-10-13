'use client';

import Link from 'next/link';
import { Settings, ArrowLeft, Film } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CONTENT_TYPES } from './quizTypes';
import { useQuizData } from './useQuizData';
import { QuizSettingsTab } from './QuizSettingsTab';
import { QuizContentTab } from './QuizContentTab';
import { useTranslations } from 'next-intl';

export default function AdminQuizPage() {
  const { user, isPrivileged } = useAuth();
  const t = useTranslations('AdminQuizPage');

  const quiz = useQuizData();

  console.log(
    '🎮 [AdminQuizPage] Rendering, activeTab:',
    quiz.activeTab,
    'contentType:',
    quiz.selectedContentType
  );

  // Yetki kontrolü
  if (!user || !isPrivileged) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{t('accessDenied')}</h1>
          <p className="text-gray-400">{t('accessDeniedDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
            <p className="text-gray-400 mt-1">{t('desc')}</p>
          </div>
        </div>

        {/* Content Type Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                quiz.setSelectedContentType(type.id);
                quiz.setSelectedContent(null);
                quiz.setSearchQuery('');
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
                ${
                  quiz.selectedContentType === type.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {type.emoji}{' '}
              {type.name === 'Film'
                ? t('contentTypes.movie')
                : type.name === 'Dizi'
                  ? t('contentTypes.tv')
                  : type.name === 'Oyun'
                    ? t('contentTypes.game')
                    : t('contentTypes.book')}
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => quiz.setActiveTab('settings')}
            className={`px-6 py-3 font-medium transition-colors ${
              quiz.activeTab === 'settings'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            {t('tabs.settings')}
          </button>
          <button
            onClick={() => quiz.setActiveTab('content')}
            className={`px-6 py-3 font-medium transition-colors ${
              quiz.activeTab === 'content'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4 inline mr-2" />
            {t('tabs.content', {
              enabledContentCount: quiz.enabledContentCount,
              enabledCount: quiz.enabledCount,
            })}
          </button>
        </div>

        {/* Settings Tab */}
        {quiz.activeTab === 'settings' && (
          <QuizSettingsTab
            currentSettings={quiz.currentSettings}
            updatingSettings={quiz.updatingSettings}
            onSettingChange={quiz.handleSettingChange}
            onSaveSettings={quiz.handleSaveSettings}
          />
        )}

        {/* Content Tab */}
        {quiz.activeTab === 'content' && (
          <QuizContentTab
            searchQuery={quiz.searchQuery}
            setSearchQuery={quiz.setSearchQuery}
            currentPage={quiz.currentPage}
            setCurrentPage={quiz.setCurrentPage}
            searchLoading={quiz.searchLoading}
            searchData={quiz.searchData}
            selectedContent={quiz.selectedContent}
            setSelectedContent={quiz.setSelectedContent}
            screenshots={quiz.screenshots}
            screenshotsLoading={quiz.screenshotsLoading}
            enabledContentCount={quiz.enabledContentCount}
            enabledCount={quiz.enabledCount}
            filterMode={quiz.filterMode}
            setFilterMode={quiz.setFilterMode}
            toggleScreenshot={quiz.toggleScreenshot}
            deleteScreenshot={quiz.deleteScreenshot}
            onDifficultyChange={quiz.handleDifficultyChange}
          />
        )}
      </div>
    </div>
  );
}
