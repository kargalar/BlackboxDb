import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Hoş geldiniz 👋</h1>
      <p className="max-w-prose opacity-80">
        Next.js + Tailwind başlangıç projesi hazır. Keşfet sayfası ve temel UI bileşenleri eklenecek.
      </p>
      <div className="flex gap-3">
        <a href="/explore">
          <Button>Keşfet</Button>
        </a>
        <a href="#">
          <Button variant="secondary">Giriş Yap</Button>
        </a>
      </div>
    </section>
  );
}
