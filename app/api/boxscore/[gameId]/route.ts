import { NextResponse } from 'next/server';
import { fetchBoxScore } from '@/lib/nba-api';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const boxScore = await fetchBoxScore(gameId);
    if (!boxScore) {
      return NextResponse.json({ error: 'Box score not found' }, { status: 404 });
    }
    return NextResponse.json(boxScore);
  } catch (error) {
    console.error('Box score fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch box score' }, { status: 500 });
  }
}
