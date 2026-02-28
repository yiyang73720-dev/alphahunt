import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/scanner/state';
import { isGameHours } from '@/lib/scanner/scanner';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getStatus();
  return NextResponse.json({
    ...status,
    isGameHours: isGameHours(),
    timestamp: new Date().toISOString(),
  });
}
