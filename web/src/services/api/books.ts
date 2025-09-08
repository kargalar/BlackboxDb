export type GoogleBook = {
  id: string;
  title: string;
  authors?: string[];
  publishedDate?: string;
  thumbnail?: string | null;
  infoLink?: string | null;
};

export async function booksSearch(q: string, limit = 24) {
  const url = new URL('/api/books/search', typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    let msg = `Books search failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += ` - ${j.error}`;
    } catch (_) {
      try {
        const t = await res.text();
        if (t) msg += ` - ${t}`;
      } catch {}
    }
    throw new Error(msg);
  }
  const json = (await res.json()) as { data: GoogleBook[] };
  return json.data;
}

export async function getBookById(id: string) {
  const url = new URL(`/api/books/${encodeURIComponent(id)}`, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    let msg = `Books getById failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += ` - ${j.error}`;
    } catch (_) {
      try {
        const t = await res.text();
        if (t) msg += ` - ${t}`;
      } catch {}
    }
    throw new Error(msg);
  }
  const json = await res.json();
  return json.data as {
    id: string;
    title: string;
    subtitle?: string | null;
    authors?: string[];
    publishedDate?: string | null;
    description?: string | null;
    categories?: string[];
    pageCount?: number | null;
    publisher?: string | null;
    language?: string | null;
    thumbnail?: string | null;
    infoLink?: string | null;
    previewLink?: string | null;
  };
}
