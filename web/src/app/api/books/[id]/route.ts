import { NextRequest } from 'next/server';

export const revalidate = 300;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = (params.id || '').trim();
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });

  const apiUrl = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}`;
  try {
    const resp = await fetch(apiUrl, { method: 'GET', next: { revalidate } });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return new Response(JSON.stringify({ error: `Google Books error ${resp.status}: ${text}` }), { status: 502 });
    }
    const v = await resp.json();
    const vi = v?.volumeInfo ?? {};
    const data = {
      id: v?.id as string,
      title: (vi.title as string) || 'Untitled',
      subtitle: (vi.subtitle as string) || null,
      authors: (vi.authors as string[]) || [],
      publishedDate: (vi.publishedDate as string) || null,
      description: (vi.description as string) || null,
      categories: (vi.categories as string[]) || [],
      pageCount: (vi.pageCount as number) || null,
      publisher: (vi.publisher as string) || null,
      language: (vi.language as string) || null,
      thumbnail: (vi.imageLinks?.large || vi.imageLinks?.medium || vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail) || null,
      infoLink: (vi.infoLink as string) || null,
      previewLink: (vi.previewLink as string) || null,
    };
    return Response.json({ data });
  } catch (e: any) {
    console.error('Books getById error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Books error' }), { status: 500 });
  }
}
