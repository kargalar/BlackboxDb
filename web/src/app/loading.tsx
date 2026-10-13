export default function Loading() {
  return (
    <div aria-busy="true" className="min-h-screen flex items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
