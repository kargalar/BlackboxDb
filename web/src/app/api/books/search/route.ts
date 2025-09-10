import { NextRequest } from 'next/server';

export const revalidate = 60;

type GoogleBooksVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    infoLink?: string;
  };
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.max(1, Math.min(40, Number(searchParams.get('limit') || '24')));
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const startIndex = (page - 1) * limit;
  if (!q) return new Response(JSON.stringify({ error: 'Missing q' }), { status: 400 });

  const apiUrl = new URL('https://www.googleapis.com/books/v1/volumes');
  apiUrl.searchParams.set('q', q);
  apiUrl.searchParams.set('maxResults', String(limit));
  apiUrl.searchParams.set('startIndex', String(startIndex));

  try {
    const resp = await fetch(apiUrl.toString(), { method: 'GET', next: { revalidate } });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return new Response(JSON.stringify({ error: `Google Books error ${resp.status}: ${text}` }), { status: 502 });
    }
    const json = (await resp.json()) as { items?: GoogleBooksVolume[]; totalItems?: number };
    const items = (json.items || []).map((v) => ({
      id: v.id,
      title: v.volumeInfo?.title || 'Untitled',
      authors: v.volumeInfo?.authors || [],
      publishedDate: v.volumeInfo?.publishedDate,
      thumbnail: v.volumeInfo?.imageLinks?.thumbnail || v.volumeInfo?.imageLinks?.smallThumbnail || null,
      infoLink: v.volumeInfo?.infoLink || null,
    }));
    return Response.json({ data: items, totalItems: json.totalItems || 0 });
  } catch (e: any) {
    console.error('Books search error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Books error' }), { status: 500 });
  }
}
