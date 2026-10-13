import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6 text-center text-white">
      <div>
        <p className="text-6xl font-bold text-violet-400">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-white/60">The page you requested does not exist.</p>
        <Link href="/" className="btn-gradient mt-6 inline-flex">
          Back to home
        </Link>
      </div>
    </div>
  );
}
