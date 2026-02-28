import { NextResponse } from 'next/server';
import { fetchOdds } from '@/lib/nba-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const odds = await fetchOdds();
    return NextResponse.json({ odds, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Odds fetch error:', error);
    return NextResponse.json({ odds: [], error: 'Failed to fetch odds' }, { status: 500 });
  }
}
