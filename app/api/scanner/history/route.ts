import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/scanner/state';

export const dynamic = 'force-dynamic';

export async function GET() {
  const history = getHistory();
  return NextResponse.json({
    history,
    count: history.length,
    timestamp: new Date().toISOString(),
  });
}
