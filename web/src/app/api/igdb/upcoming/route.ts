import { upcomingGames } from '@/lib/igdb';

export const revalidate = 120;

export async function GET() {
  try {
    const data = await upcomingGames(20);
    return Response.json({ data });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'IGDB error' }), { status: 500 });
  }
}
