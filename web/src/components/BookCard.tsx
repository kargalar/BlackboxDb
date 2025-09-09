import type { Route } from 'next';
import ContentCard from '@/components/ui/ContentCard';

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

export default function BookCard({ book, size = 'medium' }: Props & { size?: 'small' | 'medium' | 'large' }) {
  const year = book.publishedDate ? (book.publishedDate.match(/\d{4}/)?.[0] ?? '') : '';
  const subtitle = [book.authors?.slice(0, 2).join(', '), year].filter(Boolean).join(' • ');
  const href = (`/content/book/${book.id}`) as Route;
  return (
    <ContentCard
      href={href}
      title={book.title}
      subtitle={subtitle || undefined}
      posterSrc={book.thumbnail ?? null}
  size={size}
  useNextImage
    />
  );
}
