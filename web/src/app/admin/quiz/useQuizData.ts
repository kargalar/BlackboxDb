'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import toast from 'react-hot-toast';
import { ITEMS_PER_PAGE } from './quizTypes';
import {
  GET_ALL_QUIZ_SETTINGS,
  UPDATE_QUIZ_SETTINGS,
  GET_QUIZ_ENABLED_COUNT,
  GET_QUIZ_ENABLED_CONTENT_COUNT,
  SEARCH_CONTENT,
  GET_CONTENT_SCREENSHOTS,
  TOGGLE_SCREENSHOT_QUIZ,
  UPDATE_SCREENSHOT,
  DELETE_SCREENSHOT,
} from './quizQueries';

export function useQuizData() {
  const [activeTab, setActiveTab] = useState<'settings' | 'content'>('settings');
  const [selectedContentType, setSelectedContentType] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [localSettings, setLocalSettings] = useState<Record<number, any>>({});
  const dirtySettingsRef = useRef(new Set<number>());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMode, setFilterMode] = useState<'all' | 'quiz' | 'has-screenshot' | 'no-screenshot'>(
    'all'
  );

  // Queries
  const {
    data: settingsData,
    loading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery<any>(GET_ALL_QUIZ_SETTINGS);

  const { data: countData, refetch: refetchCount } = useQuery<any>(GET_QUIZ_ENABLED_COUNT, {
    variables: { contentTypeId: selectedContentType },
    fetchPolicy: 'cache-and-network',
  });

  const { data: contentCountData, refetch: refetchContentCount } = useQuery<any>(
    GET_QUIZ_ENABLED_CONTENT_COUNT,
    {
      variables: { contentTypeId: selectedContentType },
      fetchPolicy: 'cache-and-network',
    }
  );

  const {
    data: searchData,
    loading: searchLoading,
    refetch: refetchSearch,
  } = useQuery<any>(SEARCH_CONTENT, {
    variables: {
      searchQuery: searchQuery || undefined,
      contentTypeId: selectedContentType,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
      hasScreenshot:
        filterMode === 'has-screenshot' ? true : filterMode === 'no-screenshot' ? false : undefined,
      hasEnabledScreenshot: filterMode === 'quiz' ? true : undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: screenshotsData,
    loading: screenshotsLoading,
    refetch: refetchScreenshots,
  } = useQuery<any>(GET_CONTENT_SCREENSHOTS, {
    variables: { contentId: selectedContent?.id },
    skip: !selectedContent,
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [updateSettings, { loading: updatingSettings }] = useMutation(UPDATE_QUIZ_SETTINGS, {
    onCompleted: () => {
      toast.success('Ayarlar kaydedildi');
      console.log('✅ [AdminQuiz] Settings updated successfully');
      refetchSettings();
    },
    onError: (error) => {
      toast.error('Hata: ' + error.message);
      console.error('❌ [AdminQuiz] Settings update error:', error);
    },
  });

  const [toggleScreenshot] = useMutation(TOGGLE_SCREENSHOT_QUIZ, {
    onCompleted: () => {
      console.log('🔄 [AdminQuiz] Screenshot toggled');
      refetchScreenshots();
      refetchCount();
    },
    onError: (error) => {
      console.error('❌ [AdminQuiz] Screenshot toggle error:', error);
    },
  });

  const [updateScreenshot] = useMutation(UPDATE_SCREENSHOT, {
    onCompleted: () => {
      console.log('✅ [AdminQuiz] Screenshot updated');
      refetchScreenshots();
    },
    onError: (error) => {
      console.error('❌ [AdminQuiz] Screenshot update error:', error);
    },
  });

  const [deleteScreenshot] = useMutation(DELETE_SCREENSHOT, {
    onCompleted: () => {
      toast.success('Ekran görüntüsü silindi');
      console.log('🗑️ [AdminQuiz] Screenshot deleted');
      refetchScreenshots();
      refetchCount();
    },
    onError: (error) => {
      console.error('❌ [AdminQuiz] Screenshot delete error:', error);
    },
  });

  // Local settings'i başlangıçta doldur
  useEffect(() => {
    if (settingsData?.getAllQuizSettings) {
      const settings: Record<number, any> = {};
      settingsData.getAllQuizSettings.forEach((s: any) => {
        settings[s.contentTypeId] = { ...s };
      });
      setLocalSettings((currentSettings) => {
        dirtySettingsRef.current.forEach((contentTypeId) => {
          const draft = currentSettings[contentTypeId];
          if (draft) settings[contentTypeId] = draft;
        });

        return settings;
      });
      console.log('📋 [AdminQuiz] Settings loaded:', settings);
    }
  }, [settingsData]);

  const currentSettings = localSettings[selectedContentType] || {};
  const screenshots = screenshotsData?.getContentScreenshots || [];
  const enabledCount = countData?.getQuizEnabledScreenshotCount || 0;
  const enabledContentCount = contentCountData?.getQuizEnabledContentCount || 0;

  // Ayarları güncelle
  const handleSettingChange = (field: string, value: any) => {
    dirtySettingsRef.current.add(selectedContentType);
    setLocalSettings((prev) => ({
      ...prev,
      [selectedContentType]: {
        ...prev[selectedContentType],
        [field]: value,
      },
    }));
  };

  // Ayarları kaydet
  const handleSaveSettings = () => {
    const settings = localSettings[selectedContentType];
    if (!settings) return;

    console.log('💾 [AdminQuiz] Saving settings:', settings);
    updateSettings({
      variables: {
        input: {
          contentTypeId: selectedContentType,
          isActive: settings.isActive,
          timePerQuestion: settings.timePerQuestion,
          questionsCount: settings.questionsCount,
          pointsLevel1: settings.pointsLevel1,
          pointsLevel2: settings.pointsLevel2,
          pointsLevel3: settings.pointsLevel3,
          pointsLevel4: settings.pointsLevel4,
          pointsLevel5: settings.pointsLevel5,
        },
      },
    });
  };

  // Screenshot zorluğunu güncelle
  const handleDifficultyChange = (
    id: number,
    difficulty: number,
    currentEnabledStatus?: boolean
  ) => {
    console.log('🎯 [AdminQuiz] Updating difficulty:', id, difficulty);
    updateScreenshot({
      variables: {
        input: { id, difficulty },
      },
    });

    // Eğer quiz için henüz aktif değilse, aktif yap
    if (currentEnabledStatus === false) {
      toggleScreenshot({
        variables: { id, enabled: true },
      });
    }
  };

  return {
    // State
    activeTab,
    setActiveTab,
    selectedContentType,
    setSelectedContentType,
    searchQuery,
    setSearchQuery,
    selectedContent,
    setSelectedContent,
    currentPage,
    setCurrentPage,
    filterMode,
    setFilterMode,
    // Derived
    currentSettings,
    screenshots,
    enabledCount,
    enabledContentCount,
    // Loading states
    settingsLoading,
    searchLoading,
    screenshotsLoading,
    updatingSettings,
    // Data
    searchData,
    // Handlers
    handleSettingChange,
    handleSaveSettings,
    handleDifficultyChange,
    toggleScreenshot,
    deleteScreenshot,
  };
}
