import { NextResponse } from 'next/server';
import { fetchScoreboard } from '@/lib/nba-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const games = await fetchScoreboard();
    return NextResponse.json({ games, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Scores fetch error:', error);
    return NextResponse.json({ games: [], error: 'Failed to fetch scores' }, { status: 500 });
  }
}
