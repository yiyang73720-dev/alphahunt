import { NextResponse } from 'next/server';
import { startScanner } from '@/lib/scanner/scanner';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = startScanner();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { started: false, message: String(error) },
      { status: 500 }
    );
  }
}
