import { NextRequest, NextResponse } from 'next/server';
import { sendBetAlert } from '@/lib/alerts/email';
import { sendPhoneAlert } from '@/lib/alerts/phone';

export const dynamic = 'force-dynamic';

interface AlertPayload {
  type: 'bet';
  team: string;
  opponent?: string;
  game?: string;
  signalType?: string;
  tier?: string;
  score: string;
  spread?: string;
  betSize: number;
  kellyPct?: number;
  estEdge?: number;
  estWinProb?: number;
  urgency?: string;
  recType?: string;
  elapsedMins?: number;
  starName?: string;
  signalCount?: number;
  firedAt?: string;
  betType?: 'ML' | 'SPREAD';
  dogML?: number;
  dogSpread?: number;
}

export async function POST(request: NextRequest) {
  try {
    const data: AlertPayload = await request.json();

    if (!data.type || !data.team || !data.score || !data.betSize) {
      return NextResponse.json(
        { error: 'Missing required fields: type, team, score, betSize' },
        { status: 400 },
      );
    }

    const results: Record<string, unknown> = {};

    // Send email alert
    const emailResult = await sendBetAlert({
      team: data.team,
      opponent: data.opponent,
      game: data.game || data.team,
      signalType: data.signalType || 'SIGNAL',
      tier: data.tier,
      score: data.score,
      spread: data.spread,
      betSize: data.betSize,
      kellyPct: data.kellyPct,
      estEdge: data.estEdge,
      estWinProb: data.estWinProb,
      urgency: data.urgency,
      recType: data.recType,
      elapsedMins: data.elapsedMins,
      starName: data.starName,
      firedAt: data.firedAt || new Date().toISOString(),
      betType: data.betType,
      dogML: data.dogML,
      dogSpread: data.dogSpread,
    });
    results.email = emailResult;

    // Send phone alert (call for Tier 2+, SMS for Tier 1)
    const phoneResult = await sendPhoneAlert(
      {
        team: data.team,
        signalType: data.signalType || 'SIGNAL',
        tier: data.tier,
        score: data.score,
        betSize: data.betSize,
        betType: data.betType,
        dogML: data.dogML,
        dogSpread: data.dogSpread,
      },
      data.signalCount || 1,
    );
    results.phone = phoneResult;

    const allSucceeded = emailResult.success && phoneResult.success;

    return NextResponse.json({
      success: allSucceeded,
      results,
      timestamp: new Date().toISOString(),
    }, { status: allSucceeded ? 200 : 207 });
  } catch (error) {
    console.error('Alert API error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
