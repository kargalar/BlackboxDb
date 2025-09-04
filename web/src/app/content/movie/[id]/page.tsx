import { tmdbImage } from '@/services/tmdb';
import Image from 'next/image';

export default async function MovieDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  // Placeholder; will fetch details later
  return (
    <section className="grid gap-6 md:grid-cols-[200px_1fr]">
      <div className="aspect-[2/3] w-[200px] rounded-lg border bg-slate-100 dark:bg-slate-900" />
      <div>
        <h1 className="text-2xl font-bold">Film #{id}</h1>
        <p className="opacity-80">Detay sayfası yakında TMDB verileri ile doldurulacak.</p>
      </div>
    </section>
  );
}
