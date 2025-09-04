import { getMovieDetails, tmdbImage } from '@/services/tmdb';
import Image from 'next/image';
import { notFound } from 'next/navigation';

// Generate static params for popular movies
export async function generateStaticParams() {
  // For static export, we'll generate a few popular movies
  // In a real scenario, you might fetch popular movies or have a predefined list
  const popularMovieIds = [
    '550', '680', '13', '120', '155', '27205', '49026', '157336', '447332', '299536'
  ];
  
  return popularMovieIds.map((id) => ({
    id: id,
  }));
}

export default async function MovieDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  let movie;
  try {
    movie = await getMovieDetails(id);
  } catch (error) {
    notFound();
  }

  const director = movie.credits?.crew.find(person => person.job === 'Director');
  const mainCast = movie.credits?.cast.slice(0, 6) || [];
  const trailer = movie.videos?.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}s ${movie.runtime % 60}dk` : '';
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative">
        {movie.backdrop_path && (
          <div className="relative h-96 md:h-[500px] overflow-hidden rounded-2xl">
            <Image
              src={tmdbImage(movie.backdrop_path, 'original')}
              alt={movie.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                {/* Poster */}
                <div className="relative aspect-[2/3] w-48 md:w-full rounded-xl overflow-hidden shadow-2xl">
                  {movie.poster_path ? (
                    <Image
                      src={tmdbImage(movie.poster_path, 'w500')}
                      alt={movie.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Movie Info */}
                <div className="space-y-4 text-white">
                  <div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-2">{movie.title}</h1>
                    {movie.tagline && (
                      <p className="text-lg md:text-xl text-gray-300 italic">{movie.tagline}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="font-semibold">{movie.vote_average.toFixed(1)}</span>
                      <span className="text-gray-300">({movie.vote_count.toLocaleString()} oy)</span>
                    </div>
                    {year && <span className="text-gray-300">{year}</span>}
                    {runtime && <span className="text-gray-300">{runtime}</span>}
                    <span className="text-gray-300 uppercase">{movie.original_language}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map(genre => (
                      <span key={genre.id} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                        {genre.name}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Listeye Ekle
                    </button>
                    {trailer && (
                      <a 
                        href={`https://www.youtube.com/watch?v=${trailer.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Fragman İzle
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overview */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Hikaye</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {movie.overview || 'Bu film için henüz özet bilgisi bulunmuyor.'}
            </p>
          </section>

          {/* Cast */}
          {mainCast.length > 0 && (
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Oyuncular</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {mainCast.map(person => (
                  <div key={person.id} className="text-center">
                    <div className="relative aspect-[2/3] mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {person.profile_path ? (
                        <Image
                          src={tmdbImage(person.profile_path, 'w185')}
                          alt={person.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">{person.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{person.character}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Movie Info */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Film Bilgileri</h2>
            <div className="space-y-3 text-sm">
              {director && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Yönetmen:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">{director.name}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600 dark:text-gray-400">Çıkış Tarihi:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{new Date(movie.release_date).toLocaleDateString('tr-TR')}</span>
              </div>
              {movie.runtime && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Süre:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{runtime}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600 dark:text-gray-400">Dil:</span>
                <span className="ml-2 text-gray-900 dark:text-white uppercase">{movie.original_language}</span>
              </div>
              {movie.budget > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Bütçe:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">${movie.budget.toLocaleString()}</span>
                </div>
              )}
              {movie.revenue > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Hasılat:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">${movie.revenue.toLocaleString()}</span>
                </div>
              )}
            </div>
          </section>

          {/* Similar Movies */}
          {movie.similar && movie.similar.results.length > 0 && (
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Benzer Filmler</h2>
              <div className="space-y-3">
                {movie.similar.results.slice(0, 5).map(similar => (
                  <a key={similar.id} href={`/content/movie/${similar.id}`} className="flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors">
                    <div className="relative w-12 h-18 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                      {similar.poster_path && (
                        <Image
                          src={tmdbImage(similar.poster_path, 'w185')}
                          alt={similar.title || ''}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">{similar.title || similar.name}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">⭐ {similar.vote_average.toFixed(1)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
