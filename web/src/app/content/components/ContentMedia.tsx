'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import ContentScreenshots from './ContentScreenshots';
import { UnifiedContent } from '@/types/unified-content';
import { ImageIcon, Music2, Video } from 'lucide-react';
import { ContentSoundtrack } from './ContentSoundtrack';

interface ContentMediaProps {
  content: UnifiedContent;
  isWatched: boolean;
}

export default function ContentMedia({ content, isWatched }: ContentMediaProps) {
  const tHeader = useTranslations('ContentHeader');
  const tScreenshots = useTranslations('ContentScreenshots');

  const screenshots = content?.screenshots || [];
  const hasScreenshots = screenshots.length > 0;

  const uniqueImages = (content?.images || []).filter(
    (img, index, self) => index === self.findIndex((t) => t.filePath === img.filePath)
  );

  const posters = uniqueImages
    .filter((img) => img.type === 'poster')
    .map((img, index) => ({
      ...img,
      imageUrl: img.filePath,
      order: index,
      difficulty: 1,
      isEnabledForQuiz: false,
    }));
  const hasPosters = posters.length > 1; // Only show tab if more than 1

  const backdrops = uniqueImages
    .filter((img) => img.type === 'backdrop')
    .map((img, index) => ({
      ...img,
      imageUrl: img.filePath,
      order: index,
      difficulty: 1,
      isEnabledForQuiz: false,
    }));
  const hasBackdrops = backdrops.length > 1; // Only show tab if more than 1

  const videos = [
    { url: content?.trailerUrl, title: tHeader('videoTypes.trailer') },
    { url: content?.reviewVideoUrl, title: tHeader('videoTypes.review') },
    { url: content?.gameplayVideoUrl, title: tHeader('videoTypes.gameplay') },
  ].filter((video) => video.url);

  const hasVideos = videos.length > 0;
  const soundtrackUrl = content?.spotifyPlaylistUrl;
  const hasSoundtrack = Boolean(soundtrackUrl);

  // Tabs should be visible if we have more than one type of media
  const availableTabs = [
    ...(hasScreenshots ? ['screenshots'] : []),
    ...(hasVideos ? ['videos'] : []),
    ...(hasSoundtrack ? ['soundtrack'] : []),
    ...(hasPosters ? ['posters'] : []),
    ...(hasBackdrops ? ['backdrops'] : []),
  ];

  const [activeTab, setActiveTab] = useState<string>(
    availableTabs.length > 0 ? availableTabs[0] : ''
  );

  if (availableTabs.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Tabs */}
      {(availableTabs.length > 1 || hasSoundtrack) && (
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/10 pb-4">
          {hasScreenshots && (
            <button
              onClick={() => setActiveTab('screenshots')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'screenshots'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              {tScreenshots('title')} ({screenshots.length})
            </button>
          )}
          {hasVideos && (
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <Video className="w-4 h-4" />
              {tHeader('videos')} ({videos.length})
            </button>
          )}
          {hasSoundtrack && (
            <button
              onClick={() => setActiveTab('soundtrack')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'soundtrack'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <Music2 className="w-4 h-4" />
              {tHeader('soundtrack')}
            </button>
          )}
          {hasPosters && (
            <button
              onClick={() => setActiveTab('posters')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'posters'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Posterler ({posters.length})
            </button>
          )}
          {hasBackdrops && (
            <button
              onClick={() => setActiveTab('backdrops')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'backdrops'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Arkaplanlar ({backdrops.length})
            </button>
          )}
        </div>
      )}

      {/* Screenshots Tab */}
      {hasScreenshots && activeTab === 'screenshots' && (
        <ContentScreenshots
          screenshots={screenshots as any}
          isWatched={isWatched}
          hideTitle={availableTabs.length > 1}
          mediaType="screenshot"
        />
      )}

      {/* Posters Tab */}
      {hasPosters && activeTab === 'posters' && (
        <ContentScreenshots
          screenshots={posters as any}
          isWatched={isWatched}
          hideTitle={availableTabs.length > 1}
          mediaType="image"
          imageType="poster"
        />
      )}

      {/* Backdrops Tab */}
      {hasBackdrops && activeTab === 'backdrops' && (
        <ContentScreenshots
          screenshots={backdrops as any}
          isWatched={isWatched}
          hideTitle={availableTabs.length > 1}
          mediaType="image"
          imageType="backdrop"
        />
      )}

      {/* Videos Tab */}
      {hasVideos && activeTab === 'videos' && (
        <div className="animate-in fade-in duration-300">
          {availableTabs.length === 1 && (
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {tHeader('videos')}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">({videos.length})</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => {
              const url = video.url!;
              let embedUrl = url;
              const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                /^([a-zA-Z0-9_-]{11})$/,
              ];
              for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                  embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
                  break;
                }
              }

              return (
                <div key={index} className="flex flex-col gap-3 group">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {video.title}
                  </span>
                  <div className="relative pb-[56.25%] h-0 rounded-2xl overflow-hidden bg-gray-900 shadow-xl shadow-black/20 ring-1 ring-white/10 group-hover:ring-violet-500/50 transition-all">
                    <iframe
                      src={embedUrl}
                      className="absolute top-0 left-0 w-full h-full"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasSoundtrack && activeTab === 'soundtrack' && (
        <div className="animate-in fade-in duration-300">
          <ContentSoundtrack spotifyPlaylistUrl={soundtrackUrl!} />
        </div>
      )}
    </div>
  );
}
