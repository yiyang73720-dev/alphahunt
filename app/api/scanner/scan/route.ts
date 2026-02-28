import { NextResponse } from 'next/server';
import { runOnce } from '@/lib/scanner/scanner';

export const dynamic = 'force-dynamic';

// POST /api/scanner/scan — Run a single scan cycle (for testing)
export async function POST() {
  try {
    const result = await runOnce();
    return NextResponse.json({
      signals: result.signals,
      newSignals: result.newSignals,
      signalCount: result.signals.length,
      newSignalCount: result.newSignals.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
