'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Trophy,
  Medal,
  Crown,
  ArrowLeft,
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  User,
  Target,
  Percent,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type LeaderboardEntry = {
  id: number;
  userId: string;
  username: string;
  picturePath?: string | null;
  contentTypeId: number;
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

const GET_LEADERBOARD = gql`
  query GetLeaderboard($contentTypeId: Int!, $limit: Int) {
    getLeaderboard(contentTypeId: $contentTypeId, limit: $limit) {
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

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Yükleniyor...</div>}>
      <LeaderboardPageInner />
    </Suspense>
  );
}

function LeaderboardPageInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const initialType = parseInt(searchParams.get('type') || '1');
  const [selectedType, setSelectedType] = useState(initialType);

  const { data: leaderboardData, loading } = useQuery<GetLeaderboardData>(GET_LEADERBOARD, {
    variables: { contentTypeId: selectedType, limit: 100 },
    fetchPolicy: 'cache-and-network',
  });

  const { data: myEntryData } = useQuery<GetMyLeaderboardEntryData>(GET_MY_ENTRY, {
    variables: { contentTypeId: selectedType },
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });

  const currentType = CONTENT_TYPES.find((t) => t.id === selectedType);
  const leaderboard = leaderboardData?.getLeaderboard || [];
  const myEntry = myEntryData?.getMyLeaderboardEntry;

  // Sıralama badge'i
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return (
      <span className="w-6 h-6 flex items-center justify-center text-gray-400 font-bold">
        {rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/quiz"
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Liderlik Tablosu
            </h1>
            <p className="text-gray-400 mt-1">En iyi oyuncuları keşfet</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {CONTENT_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = selectedType === type.id;

            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap
                  ${
                    isActive
                      ? ` ${type.color} text-white`
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {type.name}
              </button>
            );
          })}
        </div>

        {/* My Stats Card */}
        {myEntry && (
          <div className="mb-8 p-6 bg-white/5.02] rounded-2xl border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Senin Sıralamanız
            </h3>

            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-700">
                {myEntry.picturePath ? (
                  <Image
                    src={myEntry.picturePath}
                    alt={myEntry.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                    {myEntry.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Rank & Name */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`
                    text-3xl font-bold
                    ${myEntry.rank === 1 ? 'text-yellow-400' : ''}
                    ${myEntry.rank === 2 ? 'text-gray-300' : ''}
                    ${myEntry.rank === 3 ? 'text-amber-600' : ''}
                    ${myEntry.rank > 3 ? 'text-white' : ''}
                  `}
                  >
                    #{myEntry.rank}
                  </span>
                  <span className="text-xl font-semibold text-white">{myEntry.username}</span>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {myEntry.totalQuizzes} quiz
                  </span>
                  <span className="flex items-center gap-1">
                    <Percent className="w-4 h-4" />
                    {Math.round((myEntry.correctAnswers / myEntry.totalQuestions) * 100)}% doğru
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-3xl font-bold text-white">
                  {myEntry.totalScore.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">toplam puan</div>
                <div className="text-sm text-green-400 mt-1">En iyi: {myEntry.bestScore}</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-700/50 text-sm font-semibold text-gray-400">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Oyuncu</div>
            <div className="col-span-2 text-center">Quiz</div>
            <div className="col-span-2 text-center">Başarı</div>
            <div className="col-span-2 text-right">Puan</div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-transparent" />
            </div>
          )}

          {/* Empty State */}
          {!loading && leaderboard.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Henüz kimse oynamadı</p>
              <Link
                href={`/quiz/play?type=${selectedType}`}
                className="inline-block mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold"
              >
                İlk Sen Oyna!
              </Link>
            </div>
          )}

          {/* Leaderboard Rows */}
          {!loading &&
            leaderboard.map((entry: any, index: number) => {
              const isCurrentUser = user && entry.userId === user.id;
              const accuracy = Math.round((entry.correctAnswers / entry.totalQuestions) * 100);

              return (
                <div
                  key={entry.id}
                  className={`
                  grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors
                  ${index < 3 ? '' : ''}
                  ${index === 0 ? 'bg-yellow-500/10 ' : ''}
                  ${index === 1 ? 'bg-gray-400/10 ' : ''}
                  ${index === 2 ? 'bg-amber-700/10 ' : ''}
                  ${isCurrentUser ? 'bg-white/5 border-l-4 border-white/30' : 'hover:bg-gray-700/50'}
                  ${index !== leaderboard.length - 1 ? 'border-b border-gray-700/50' : ''}
                `}
                >
                  {/* Rank */}
                  <div className="col-span-1">{getRankBadge(entry.rank)}</div>

                  {/* User */}
                  <Link
                    href={`/profile/${entry.username}`}
                    className="col-span-5 flex items-center gap-3 group"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      {entry.picturePath ? (
                        <Image
                          src={entry.picturePath}
                          alt={entry.username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                        {entry.username}
                        {isCurrentUser && (
                          <span className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded-full">
                            Sen
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">En iyi: {entry.bestScore}</div>
                    </div>
                  </Link>

                  {/* Quiz Count */}
                  <div className="col-span-2 text-center text-gray-300">{entry.totalQuizzes}</div>

                  {/* Accuracy */}
                  <div className="col-span-2 text-center">
                    <span
                      className={`
                    font-medium
                    ${accuracy >= 80 ? 'text-green-400' : ''}
                    ${accuracy >= 60 && accuracy < 80 ? 'text-yellow-400' : ''}
                    ${accuracy < 60 ? 'text-red-400' : ''}
                  `}
                    >
                      %{accuracy}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="col-span-2 text-right">
                    <span className="font-bold text-white text-lg">
                      {entry.totalScore.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Play CTA */}
        <div className="mt-8 text-center">
          <Link
            href={`/quiz/play?type=${selectedType}`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-700 hover:bg-gray-600 hover: text-white text-lg font-bold rounded-xl transition-all"
          >
            {currentType?.emoji} {currentType?.name} Quiz&apos;e Başla
          </Link>
        </div>
      </div>
    </div>
  );
}
