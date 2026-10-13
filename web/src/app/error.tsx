'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center bg-black px-6 text-center text-white"
    >
      <div>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-white/60">
          Please try again. If the problem continues, check the server connection.
        </p>
        <button type="button" onClick={() => reset()} className="btn-gradient mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}
