import React from 'react';
import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import { GET_TOP_CONTRIBUTORS } from '@/services/graphql/contribution';
import Link from 'next/link';

export default function TopContributors() {
  const { data, loading, error } = useQuery<any>(GET_TOP_CONTRIBUTORS, {
    variables: { limit: 10 },
    fetchPolicy: 'cache-and-network',
  });

  if (loading) return <div className="p-4 rounded-lg bg-black/40 animate-pulse h-40"></div>;
  if (error) return null;

  const contributors = data?.getTopContributors || [];

  if (contributors.length === 0) return null;

  return (
    <div className="bg-black/40 rounded-xl p-6 border border-white/5 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-yellow-500">🏆</span> En Çok Katkı Sağlayanlar
      </h3>
      <div className="space-y-4">
        {contributors.map((entry: any, index: number) => (
          <Link href={`/profile/${entry.user.username}`} key={entry.user.id}>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="relative h-10 w-10 shrink-0">
                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 font-bold text-white/50"
                >
                  {entry.user.username.charAt(0).toUpperCase()}
                </div>
                {entry.user.picturePath ? (
                  <Image
                    src={entry.user.picturePath}
                    alt=""
                    width={40}
                    height={40}
                    sizes="40px"
                    unoptimized
                    className="absolute inset-0 h-10 w-10 rounded-full border border-white/10 object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                {index < 3 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black border border-black">
                    #{index + 1}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  {entry.user.username}
                </div>
                <div className="text-xs text-white/50">{entry.contributionScore} Puan</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
