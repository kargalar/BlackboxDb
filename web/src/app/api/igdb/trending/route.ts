import { trendingGames } from '@/lib/igdb';

export const revalidate = 60;

export async function GET() {
  try {
    const data = await trendingGames(20);
    return Response.json({ data });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'IGDB error' }), { status: 500 });
  }
}
