import { NextRequest } from 'next/server';
import { searchGames } from '@/lib/igdb';

export const revalidate = 60; // cache per-request for a minute on the server

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Number(searchParams.get('limit') || '20');
  const page = Number(searchParams.get('page') || '1');
  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing q' }), { status: 400 });
  }
  try {
    const data = await searchGames(q, isNaN(limit) ? 20 : limit, isNaN(page) ? 1 : page);
    return Response.json({ data });
  } catch (e: any) {
    console.error('IGDB search error:', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'IGDB error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
