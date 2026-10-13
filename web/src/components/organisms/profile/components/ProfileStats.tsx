interface ProfileStatsProps {
  stats: {
    totalMovies: number;
    thisYearMovies: number;
    averageRating: number;
    discussionCount: number;
  };
}

/** Left sidebar stats panel for the profile home tab */
export default function ProfileStats({ stats }: ProfileStatsProps) {
  console.log('📊 [ProfileStats] Rendering stats:', stats);

  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-violet-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          İstatistikler
        </h3>

        <div className="space-y-4">
          <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-lg shadow-inner">
                ★
              </div>
              <div className="text-sm font-medium text-white/60">Ortalama Puan</div>
            </div>
            <div className="text-xl font-black text-white">{stats.averageRating.toFixed(1)}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg shadow-inner">
                💬
              </div>
              <div className="text-sm font-medium text-white/60">Tartışma</div>
            </div>
            <div className="text-xl font-black text-white">{stats.discussionCount}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg shadow-inner">
                ✓
              </div>
              <div className="text-sm font-medium text-white/60">Toplam İçerik</div>
            </div>
            <div className="text-xl font-black text-white">{stats.totalMovies}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
