// no imports

type Props = {
  book: {
    id: string;
    title: string;
    authors?: string[];
    publishedDate?: string;
    thumbnail?: string | null;
    infoLink?: string | null;
  };
};

export default function BookCard({ book }: Props) {
  const year = book.publishedDate ? (book.publishedDate.match(/\d{4}/)?.[0] ?? '') : '';
  const Inner = (
    <>
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
        {book.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.thumbnail} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full grid place-items-center text-gray-400 p-3 text-center text-xs">Kapak yok</div>
        )}
      </div>
      <div className="mt-2 space-y-1">
        <div className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white" title={book.title}>
          {book.title}
        </div>
        {(book.authors?.length || year) ? (
          <div className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
            {[book.authors?.slice(0, 2).join(', '), year].filter(Boolean).join(' • ')}
          </div>
        ) : null}
      </div>
    </>
  );
  return (
    <a href={`/content/book/${book.id}`} className="group block">
      {Inner}
    </a>
  );
}
