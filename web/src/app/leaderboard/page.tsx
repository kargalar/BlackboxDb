'use client';

import { Suspense, useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Medal, Crown, ArrowLeft, User, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';

type ContributorLeaderboardEntry = {
  rank: number;
  contributionScore: number;
  user: {
    id: string;
    username: string;
    picturePath?: string | null;
  };
};

type GetTopContributorsData = {
  getTopContributors: ContributorLeaderboardEntry[];
};

type GetMyContributionRankData = {
  getMyContributionRank: ContributorLeaderboardEntry | null;
};

const GET_TOP_CONTRIBUTORS = gql`
  query GetTopContributors($limit: Int) {
    getTopContributors(limit: $limit) {
      rank
      contributionScore
      user {
        id
        username
        picturePath
      }
    }
  }
`;

const GET_MY_RANK = gql`
  query GetMyContributionRank {
    getMyContributionRank {
      rank
      contributionScore
      user {
        id
        username
        picturePath
      }
    }
  }
`;

export default function ContributorsLeaderboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Yükleniyor...</div>}>
      <ContributorsLeaderboardInner />
    </Suspense>
  );
}

function ContributorsLeaderboardInner() {
  const { user } = useAuth();
  // We don't have translations yet, but standard text is fine for now
  // const t = useTranslations('Leaderboard');

  const { data: leaderboardData, loading } = useQuery<GetTopContributorsData>(
    GET_TOP_CONTRIBUTORS,
    {
      variables: { limit: 100 },
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: myRankData } = useQuery<GetMyContributionRankData>(GET_MY_RANK, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });

  const leaderboard = leaderboardData?.getTopContributors || [];
  const myEntry = myRankData?.getMyContributionRank;

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
    <div className="min-h-screen relative pt-20">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors backdrop-blur-md border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400">
                Topluluk Liderlik Tablosu
              </span>
            </h1>
            <p className="text-white/60 mt-1">En çok katkıda bulunan üyeler</p>
          </div>
        </div>

        {/* My Stats Card */}
        {myEntry && (
          <div className="mb-8 p-6 glass-card border border-white/10 rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
              <User className="w-5 h-5 text-violet-400" />
              Sıralamanız
            </h3>

            <div className="flex items-center gap-6 relative z-10">
              {/* Avatar */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/10 border-2 border-white/20">
                {myEntry.user.picturePath ? (
                  <Image
                    src={myEntry.user.picturePath}
                    alt={myEntry.user.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                    {myEntry.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Rank & Name */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`
                    text-3xl font-black drop-shadow-md
                    ${myEntry.rank === 1 ? 'text-yellow-400' : ''}
                    ${myEntry.rank === 2 ? 'text-gray-300' : ''}
                    ${myEntry.rank === 3 ? 'text-amber-600' : ''}
                    ${myEntry.rank > 3 ? 'text-white' : ''}
                    ${myEntry.rank === 0 ? 'text-white/30' : ''}
                  `}
                  >
                    {myEntry.rank > 0 ? `#${myEntry.rank}` : '-'}
                  </span>
                  <span className="text-xl font-semibold text-white">{myEntry.user.username}</span>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-white/50">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500/70" />
                    Katkı Puanı
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                  {myEntry.contributionScore.toLocaleString()}
                </div>
                <div className="text-sm text-white/40 font-medium">Toplam Puan</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-white/5 text-sm font-bold text-white/50 border-b border-white/5 uppercase tracking-wider">
            <div className="col-span-2 sm:col-span-1 text-center">Sıra</div>
            <div className="col-span-7 sm:col-span-8">Kullanıcı</div>
            <div className="col-span-3 text-right">Puan</div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-500 border-t-transparent" />
            </div>
          )}

          {/* Empty State */}
          {!loading && leaderboard.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-10 h-10 text-white/20" />
              </div>
              <p className="text-white/60 text-lg font-medium">Henüz katkıda bulunan kimse yok</p>
            </div>
          )}

          {/* Leaderboard Rows */}
          {!loading &&
            leaderboard.map((entry: any, index: number) => {
              const isCurrentUser = user && entry.user.id === user.id;

              return (
                <div
                  key={entry.user.id}
                  className={`
                  grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all duration-300
                  ${index === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''}
                  ${index === 1 ? 'bg-gradient-to-r from-gray-400/10 to-transparent' : ''}
                  ${index === 2 ? 'bg-gradient-to-r from-amber-700/10 to-transparent' : ''}
                  ${isCurrentUser ? 'bg-white/10 border-l-4 border-violet-500' : 'hover:bg-white/[0.03]'}
                  ${index !== leaderboard.length - 1 ? 'border-b border-white/5' : ''}
                `}
                >
                  {/* Rank */}
                  <div className="col-span-2 sm:col-span-1 flex justify-center">
                    {getRankBadge(entry.rank)}
                  </div>

                  {/* User */}
                  <Link
                    href={`/profile/${entry.user.username}`}
                    className="col-span-7 sm:col-span-8 flex items-center gap-4 group"
                  >
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0 border border-white/10 group-hover:border-violet-500/50 transition-colors">
                      {entry.user.picturePath ? (
                        <Image
                          src={entry.user.picturePath}
                          alt={entry.user.username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/80 font-bold text-lg">
                          {entry.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white/90 truncate flex items-center gap-2 group-hover:text-violet-400 transition-colors text-lg">
                        {entry.user.username}
                        {isCurrentUser && (
                          <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                            Sen
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Score */}
                  <div className="col-span-3 text-right">
                    <span className="font-black text-white text-xl tabular-nums">
                      {entry.contributionScore.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
