'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql } from '@apollo/client';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Clock,
  Trophy,
  Gamepad2,
  Film,
  Tv,
  BookOpen,
  ChevronRight,
  Users,
  Star,
  User,
  Target,
  Percent,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type QuizSettings = {
  id: number;
  contentTypeId: number;
  isActive: boolean;
  timePerQuestion: number;
  questionsCount: number;
  pointsLevel1: number;
  pointsLevel2: number;
  pointsLevel3: number;
  pointsLevel4: number;
  pointsLevel5: number;
};

type GetAllQuizSettingsData = {
  getAllQuizSettings: QuizSettings[];
};

type LeaderboardEntry = {
  id: number;
  userId: string;
  username: string;
  picturePath?: string | null;
  totalScore: number;
  totalQuizzes: number;
  correctAnswers: number;
  totalQuestions: number;
  bestScore: number;
  rank: number;
};

type GetLeaderboardData = {
  getLeaderboard: LeaderboardEntry[];
};

type GetMyLeaderboardEntryData = {
  getMyLeaderboardEntry: LeaderboardEntry | null;
};

const GET_ALL_QUIZ_SETTINGS = gql`
  query GetAllQuizSettings {
    getAllQuizSettings {
      id
      contentTypeId
      isActive
      timePerQuestion
      questionsCount
      pointsLevel1
      pointsLevel2
      pointsLevel3
      pointsLevel4
      pointsLevel5
    }
  }
`;

const GET_LEADERBOARD = gql`
  query GetLeaderboard($contentTypeId: Int!, $limit: Int) {
    getLeaderboard(contentTypeId: $contentTypeId, limit: $limit) {
      id
      userId
      username
      picturePath
      totalScore
      totalQuizzes
      correctAnswers
      totalQuestions
      bestScore
      rank
    }
  }
`;

const GET_MY_ENTRY = gql`
  query GetMyLeaderboardEntry($contentTypeId: Int!) {
    getMyLeaderboardEntry(contentTypeId: $contentTypeId) {
      id
      userId
      username
      picturePath
      contentTypeId
      totalScore
      totalQuizzes
      correctAnswers
      totalQuestions
      bestScore
      rank
    }
  }
`;

const CONTENT_TYPES = [
  { id: 1, name: 'Film', icon: Film, color: 'bg-red-500 ', emoji: '🎬' },
  { id: 2, name: 'Dizi', icon: Tv, color: 'bg-blue-500 ', emoji: '📺' },
  { id: 3, name: 'Oyun', icon: Gamepad2, color: 'bg-green-500 ', emoji: '🎮' },
  { id: 4, name: 'Kitap', icon: BookOpen, color: 'bg-yellow-500 ', emoji: '📚' },
];

export default function QuizPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('Quiz');
  const [selectedType, setSelectedType] = useState<number | null>(null);

  const { data: settingsData } = useQuery<GetAllQuizSettingsData>(GET_ALL_QUIZ_SETTINGS);
  const [getLeaderboard, { data: leaderboardData, loading: leaderboardLoading }] =
    useLazyQuery<GetLeaderboardData>(GET_LEADERBOARD);
  const [getMyEntry, { data: myEntryData }] = useLazyQuery<GetMyLeaderboardEntryData>(GET_MY_ENTRY);

  useEffect(() => {
    if (selectedType) {
      getLeaderboard({ variables: { contentTypeId: selectedType, limit: 5 } });
      if (user) {
        getMyEntry({ variables: { contentTypeId: selectedType } });
      }
    }
  }, [selectedType, getLeaderboard, getMyEntry, user]);

  const leaderboardList = leaderboardData?.getLeaderboard ?? [];
  const myEntry = myEntryData?.getMyLeaderboardEntry;

  const handleStartQuiz = (contentTypeId: number) => {
    router.push(`/quiz/play?type=${contentTypeId}`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="gradient-text">{t('title')}</span>
        </h1>
        <p className="text-xl text-white/50 max-w-2xl mx-auto">{t('description')}</p>
      </div>

      {/* Content Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {CONTENT_TYPES.map((type) => {
          const Icon = type.icon;
          const settings = settingsData?.getAllQuizSettings?.find(
            (s: any) => s.contentTypeId === type.id
          );
          const isActive = settings?.isActive ?? false;
          const isSelected = selectedType === type.id;

          return (
            <div
              key={type.id}
              onClick={() => isActive && setSelectedType(type.id)}
              className={`
                relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300
                ${
                  isActive
                    ? ` ${type.color} hover:scale-105 hover:shadow-2xl`
                    : 'glass-card opacity-60 cursor-not-allowed'
                }
                ${isSelected ? 'ring-4 ring-white/50 scale-105' : ''}
              `}
            >
              {/* Background Icon */}
              <Icon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />

              <div className="relative z-10">
                <div className="text-4xl mb-3">{type.emoji}</div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {type.id === 1
                    ? t('types.movie')
                    : type.id === 2
                      ? t('types.tv')
                      : type.id === 3
                        ? t('types.game')
                        : t('types.book')}
                </h3>

                {isActive ? (
                  <div className="space-y-1 text-white/80 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {settings?.timePerQuestion || 30}
                        {t('card.secondsPerQuestion')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      <span>
                        {settings?.questionsCount || 10} {t('card.questions')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/60 text-sm">{t('card.comingSoon')}</p>
                )}
              </div>

              {isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartQuiz(type.id);
                  }}
                  className="mt-4 w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {t('card.startQuiz')} <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Type Details & Leaderboard */}
      {selectedType && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Info */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span className="gradient-text">{t('howToPlay.title')}</span>
            </h2>

            <div className="space-y-4 text-white/70">
              {[
                t('howToPlay.step1'),
                t('howToPlay.step2'),
                t('howToPlay.step3'),
                t('howToPlay.step4'),
                t('howToPlay.step5'),
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 font-bold">
                    {i + 1}
                  </span>
                  <p className="pt-1">{text}</p>
                </div>
              ))}
            </div>

            {/* Puan bilgisi */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <h3 className="font-semibold mb-3">{t('points.title')}</h3>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div>
                  <div className="text-green-500 font-bold text-lg">
                    {settingsData?.getAllQuizSettings?.find(
                      (s: any) => s.contentTypeId === selectedType
                    )?.pointsLevel1 || 10}
                  </div>
                  <div className="text-white/40 text-xs" style={{ fontSize: '0.65rem' }}>
                    {t('points.veryEasy')}
                  </div>
                </div>
                <div>
                  <div className="text-lime-500 font-bold text-lg">
                    {settingsData?.getAllQuizSettings?.find(
                      (s: any) => s.contentTypeId === selectedType
                    )?.pointsLevel2 || 20}
                  </div>
                  <div className="text-white/40 text-xs">{t('points.easy')}</div>
                </div>
                <div>
                  <div className="text-yellow-500 font-bold text-lg">
                    {settingsData?.getAllQuizSettings?.find(
                      (s: any) => s.contentTypeId === selectedType
                    )?.pointsLevel3 || 30}
                  </div>
                  <div className="text-white/40 text-xs">{t('points.medium')}</div>
                </div>
                <div>
                  <div className="text-orange-500 font-bold text-lg">
                    {settingsData?.getAllQuizSettings?.find(
                      (s: any) => s.contentTypeId === selectedType
                    )?.pointsLevel4 || 40}
                  </div>
                  <div className="text-white/40 text-xs">{t('points.hard')}</div>
                </div>
                <div>
                  <div className="text-red-500 font-bold text-lg">
                    {settingsData?.getAllQuizSettings?.find(
                      (s: any) => s.contentTypeId === selectedType
                    )?.pointsLevel5 || 50}
                  </div>
                  <div className="text-white/40 text-xs" style={{ fontSize: '0.65rem' }}>
                    {t('points.veryHard')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Preview */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-500" />
                <span className="gradient-text">{t('leaderboard.title')}</span>
              </h2>
              <Link
                href={`/quiz/leaderboard?type=${selectedType}`}
                className="text-violet-400 hover:text-violet-300 text-sm font-medium flex items-center gap-1"
              >
                {t('leaderboard.seeAll')} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* My Ranking */}
            {myEntry && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('leaderboard.yourRank')}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                    {myEntry.picturePath ? (
                      <Image
                        src={myEntry.picturePath}
                        alt={myEntry.username}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold">
                        {myEntry.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xl font-bold ${myEntry.rank === 1 ? 'text-yellow-400' : myEntry.rank === 2 ? 'text-gray-300' : myEntry.rank === 3 ? 'text-amber-600' : 'text-white'}`}
                      >
                        #{myEntry.rank}
                      </span>
                      <span className="font-semibold text-white truncate">{myEntry.username}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-white/40 mt-1">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {myEntry.totalQuizzes} quiz
                      </span>
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {Math.round((myEntry.correctAnswers / myEntry.totalQuestions) * 100)}%{' '}
                        {t('leaderboard.correct')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-lg">
                      {myEntry.totalScore.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/40">{t('leaderboard.points')}</div>
                  </div>
                </div>
              </div>
            )}

            {leaderboardLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leaderboardList.length > 0 ? (
              <div className="space-y-3">
                {leaderboardList.slice(0, 5).map((entry: any, index: number) => (
                  <div
                    key={entry.id}
                    className={`
                      flex items-center gap-4 p-3 rounded-xl transition-colors
                      ${index === 0 ? 'bg-yellow-500/20' : 'bg-white/5 hover:bg-white/10'}
                    `}
                  >
                    {/* Rank */}
                    <div
                      className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500 text-black' : ''}
                      ${index === 1 ? 'bg-gray-400 text-black' : ''}
                      ${index === 2 ? 'bg-amber-700 text-white' : ''}
                      ${index > 2 ? 'bg-white/10 text-white' : ''}
                    `}
                    >
                      {entry.rank}
                    </div>

                    {/* Avatar + Info */}
                    <Link
                      href={`/profile/${entry.username}`}
                      className="flex items-center gap-4 flex-1 min-w-0 group"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                        {entry.picturePath ? (
                          <Image
                            src={entry.picturePath}
                            alt={entry.username}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                            {entry.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                          {entry.username}
                        </div>
                        <div className="text-sm text-white/40">
                          {entry.totalQuizzes} quiz • %
                          {Math.round((entry.correctAnswers / entry.totalQuestions) * 100)}{' '}
                          {t('leaderboard.correct')}
                        </div>
                      </div>
                    </Link>

                    {/* Score */}
                    <div className="text-right">
                      <div className="font-bold text-white">
                        {entry.totalScore.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/40">{t('leaderboard.points')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('leaderboard.empty')}</p>
                <p className="text-sm">{t('leaderboard.beFirst')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedType && (
        <div className="glass-card p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-xl text-white/50">{t('emptyState')}</p>
        </div>
      )}
    </div>
  );
}
