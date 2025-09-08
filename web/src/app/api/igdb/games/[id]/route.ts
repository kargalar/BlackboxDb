import { getGameById } from '@/lib/igdb';
import { NextRequest } from 'next/server';

export const revalidate = 300;

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const idNum = Number(ctx.params.id);
  if (!Number.isFinite(idNum)) {
    return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
  }
  try {
    const data = await getGameById(idNum);
    if (!data) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return Response.json({ data });
  } catch (e: any) {
    console.error('IGDB get game error:', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'IGDB error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
