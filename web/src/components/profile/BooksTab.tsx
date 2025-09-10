'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/services/database/movieLogs';
import { supabase } from '@/lib/supabase';

interface BooksTabProps {
  books: Content[];
}

export default function BooksTab({ books }: BooksTabProps) {
  const [showOnlyToRead, setShowOnlyToRead] = useState(false);

  const filteredBooks = books.filter(book => {
    if (showOnlyToRead) return book.is_consume_later;
    return !book.is_consume_later; // show read books
  });

  const handleToggleRead = async (bookId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const book = books.find(b => b.id === bookId);
      if (!book) return;

      const newReadStatus = !(!book.is_consume_later && book.date); // if not in to-read list and has date, then it's read

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ 
          content_status_id: newReadStatus ? 1 : 2,
          date: newReadStatus ? new Date().toISOString() : null 
        })
        .eq('user_id', user.user.id)
        .eq('content_id', bookId);

      if (error) throw error;

      console.log(`Book ${bookId} read status updated to ${newReadStatus}`);
    } catch (error) {
      console.error('Error updating read status:', error);
    }
  };

  const handleToggleFavorite = async (bookId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const book = books.find(b => b.id === bookId);
      if (!book) return;

      const newFavoriteStatus = !book.is_favorite;

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_favorite: newFavoriteStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', bookId);

      if (error) throw error;

      console.log(`Book ${bookId} favorite status updated to ${newFavoriteStatus}`);
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const handleToggleToRead = async (bookId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const book = books.find(b => b.id === bookId);
      if (!book) return;

      const newToReadStatus = !book.is_consume_later;

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_consume_later: newToReadStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', bookId);

      if (error) throw error;

      console.log(`Book ${bookId} to-read status updated to ${newToReadStatus}`);
    } catch (error) {
      console.error('Error updating to-read status:', error);
    }
  };

  if (books.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>Henüz kitap okumadınız.</p>
        <Link href="/explore/books" className="text-gray-400 hover:text-gray-300 mt-2 inline-block">
          Kitap keşfetmeye başlayın
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowOnlyToRead(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showOnlyToRead 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Okunan Kitaplar ({books.filter(b => !b.is_consume_later).length})
          </button>
          <button
            onClick={() => setShowOnlyToRead(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOnlyToRead 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Okuma Listesi ({books.filter(b => b.is_consume_later).length})
          </button>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredBooks.map((book) => (
          <div key={book.id} className="space-y-2">
            <Link href={`/content/book/${book.id}`} className="group block">
              <div className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden relative">
                {book.poster_path ? (
                  <Image
                    src={book.poster_path}
                    alt={book.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      console.error('❌ Kitap poster yüklenemedi:', book.title, book.poster_path);
                      // Hide the image on error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                    <span className="text-xs text-center px-2 text-gray-300">{book.title}</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-sm font-medium line-clamp-2 text-white">{book.title}</div>
              {(book.user_rating ?? 0) > 0 && (
                <div className="flex items-center mt-2">
                  <span className="text-xs text-yellow-400">★ {book.user_rating}</span>
                </div>
              )}
              {book.date && (
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(book.date).toLocaleDateString('tr-TR')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
