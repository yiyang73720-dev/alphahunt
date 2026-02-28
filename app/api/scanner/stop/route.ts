import { NextResponse } from 'next/server';
import { stopScanner } from '@/lib/scanner/scanner';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = stopScanner();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { stopped: false, message: String(error) },
      { status: 500 }
    );
  }
}
