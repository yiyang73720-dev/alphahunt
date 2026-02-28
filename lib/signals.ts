import {
  NBAGame,
  Signal,
  Urgency,
  RecType,
  GameOdds,
} from './types';

// ========================================
// Configuration
// ========================================

const TOTAL_MINS = 48;
const BANKROLL = parseInt(process.env.DEFAULT_BANKROLL || '20000');

// ========================================
// Helper: Elapsed minutes from period + clock
// ========================================

export function getElapsedMins(period: number, clock: string): number {
  const parts = clock.replace('PT', '').replace('M', ':').replace('S', '').split(':');
  const mins = parseFloat(parts[0] || '0');
  const secs = parseFloat(parts[1] || '0');
  const clockMins = mins + secs / 60;
  const periodLen = 12;

  if (period <= 4) {
    return (period - 1) * periodLen + (periodLen - clockMins);
  }
  // Overtime
  return 48 + (period - 5) * 5 + (5 - clockMins);
}

// ========================================
// Urgency Calculation
// ========================================

export function getUrgency(elapsedMins: number): { urgency: Urgency; mult: number } {
  const gamePct = elapsedMins / TOTAL_MINS;
  if (gamePct < 0.30) return { urgency: 'DEVELOPING', mult: 0.70 };
  if (gamePct < 0.60) return { urgency: 'PRIME', mult: 1.00 };
  if (gamePct < 0.85) return { urgency: 'ACT_NOW', mult: 0.85 };
  return { urgency: 'CLOSING', mult: 0.50 };
}

// ========================================
// Recommendation Type
// ========================================

export function getRecType(margin: number): { recType: RecType; } {
  if (margin <= 5) return { recType: 'ML' };
  if (margin <= 20) return { recType: 'SPREAD' };
  return { recType: 'WATCH' };
}

// ========================================
// Kelly Sizing
// ========================================

export function kellySize(
  signalCount: number,
  impliedP: number,
  marketOdds: number,
  urgencyMult: number,
): { kellyPct: number; kellyBet: number; estWinProb: number; estEdge: number } {
  // Edge formula
  const baseEdge = 0.035 + Math.min(signalCount - 1, 3) * 0.01;
  const edge = Math.min(baseEdge, 0.08);

  // Win probability
  const p = Math.min(0.90, impliedP / 100 + edge);
  const q = 1 - p;

  // Decimal odds conversion
  const b = marketOdds > 0 ? marketOdds / 100 : 100 / Math.abs(marketOdds);

  // Half-Kelly
  let fStar = (b * p - q) / b / 2;
  if (fStar < 0) fStar = 0;
  if (edge < 0.03) fStar = 0;

  // Apply urgency
  fStar *= urgencyMult;
  fStar = Math.min(fStar, 0.05);

  const kellyPct = Math.round(fStar * 1000) / 10;
  const kellyBet = Math.max(0, Math.round(BANKROLL * fStar));

  return { kellyPct, kellyBet, estWinProb: Math.round(p * 1000) / 10, estEdge: Math.round(edge * 1000) / 10 };
}

// ========================================
// Implied Probability from American Odds
// ========================================

export function impliedProb(odds: number): number {
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100) * 100;
  return 100 / (odds + 100) * 100;
}

// ========================================
// ANTI_FAV_HOT: Fav leads + shoots hot from 3 → "STAY AWAY"
// ========================================
// This is a warning signal, not a bet recommendation.
// When the favorite is leading AND shooting well from 3,
// the dog-side bet is likely to lose. Show on dashboard as a warning.

export function detectAntiFavHot(
  game: NBAGame,
  elapsedMins: number,
  odds: GameOdds | undefined,
): Signal | null {
  if (!odds) return null;
  if (elapsedMins < 12) return null; // Q2+

  const homeFav = odds.homeSpread < 0;
  const fav = homeFav ? game.homeTeam : game.awayTeam;
  const dog = homeFav ? game.awayTeam : game.homeTeam;

  // Fav must be leading
  const favLead = fav.score - dog.score;
  if (favLead < 3) return null;

  // Fav must be shooting hot from 3
  if (!fav.stats || fav.stats.fg3a < 8) return null;
  const fav3Pct = fav.stats.fg3Pct;
  if (fav3Pct < 40) return null; // 40%+ from 3 = hot

  const { urgency, mult } = getUrgency(elapsedMins);

  return {
    id: `${game.gameId}_anti_fav_hot`,
    gameId: game.gameId,
    type: 'ANTI_FAV_HOT',
    game: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
    betTeam: fav.abbr,
    fadeTeam: dog.abbr,
    signalTypes: ['ANTI_FAV_HOT'],
    signalCount: 1,
    isWarning: true,
    bookSpread: odds.homeSpread,
    kellyPct: 0,
    kellyBet: 0,
    estWinProb: 0,
    estEdge: 0,
    urgency,
    urgencyMult: mult,
    recType: 'WATCH',
    firedAt: new Date().toISOString(),
    elapsedMins: Math.round(elapsedMins * 10) / 10,
  };
}

// ========================================
// Quality Edge Detection
// ========================================

export function detectQualityEdge(
  game: NBAGame,
  elapsedMins: number,
  odds: GameOdds | undefined,
  homeWinPct: number,
  awayWinPct: number,
): Signal | null {
  // Q1-Q2 only
  if (game.period > 2) return null;
  if (elapsedMins < 3) return null;

  const qualityGap = Math.abs(homeWinPct - awayWinPct);
  if (qualityGap < 15) return null;

  const homeStronger = homeWinPct > awayWinPct;
  const strongerTeam = homeStronger ? game.homeTeam : game.awayTeam;
  const weakerTeam = homeStronger ? game.awayTeam : game.homeTeam;

  const trailingBy = weakerTeam.score - strongerTeam.score;
  if (trailingBy < 1 || trailingBy > 10) return null;

  // Estimate live spread
  if (!odds) return null;
  const bookSpread = homeStronger ? odds.homeSpread : odds.awaySpread;
  const timeFactor = game.period === 1 ? 0.75 : 0.55;
  const estLiveSpread = bookSpread + trailingBy * timeFactor;

  // Critical: only when book still favors stronger team
  if (estLiveSpread >= 0) return null;

  const { urgency, mult } = getUrgency(elapsedMins);
  const margin = trailingBy;
  const { recType } = getRecType(margin);

  const marketOdds = homeStronger ? (odds.homeML || -150) : (odds.awayML || -150);
  const ip = impliedProb(marketOdds);
  const { kellyPct, kellyBet, estWinProb, estEdge } = kellySize(1, ip, marketOdds, mult);

  return {
    id: `${game.gameId}_quality_edge`,
    gameId: game.gameId,
    type: 'QUALITY_EDGE',
    game: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
    betTeam: strongerTeam.abbr,
    fadeTeam: weakerTeam.abbr,
    signalTypes: ['QUALITY_EDGE'],
    signalCount: 1,
    qualityGap: Math.round(qualityGap * 10) / 10,
    strongerWinPct: Math.round(Math.max(homeWinPct, awayWinPct) * 10) / 10,
    trailingBy,
    bookSpread,
    estLiveSpread: Math.round(estLiveSpread * 10) / 10,
    marketOdds,
    impliedP: Math.round(ip * 10) / 10,
    kellyPct,
    kellyBet,
    estWinProb,
    estEdge,
    urgency,
    urgencyMult: mult,
    recType,
    recMargin: margin,
    firedAt: new Date().toISOString(),
    elapsedMins: Math.round(elapsedMins * 10) / 10,
  };
}

// ========================================
// Main Signal Calculator
// ========================================

interface PlayerStats {
  name: string;
  teamAbbr: string;
  points: number;
  minutes: number;
}

export function calculateSignals(
  games: NBAGame[],
  oddsMap: Record<string, GameOdds>,
  topScorersMap: Record<string, PlayerStats[]>,
  winPctMap: Record<string, number>,
): Signal[] {
  const signals: Signal[] = [];

  for (const game of games) {
    if (game.status !== 'live') continue;

    const elapsedMins = getElapsedMins(game.period, game.clock);
    const odds = oddsMap[game.gameId];

    // Quality Edge (fav signal — unchanged)
    const homeWinPct = winPctMap[game.homeTeam.abbr] || 50;
    const awayWinPct = winPctMap[game.awayTeam.abbr] || 50;
    const qe = detectQualityEdge(game, elapsedMins, odds, homeWinPct, awayWinPct);
    if (qe) signals.push(qe);

    // ANTI_FAV_HOT: warning signal — fav leads + shooting hot from 3
    const anti = detectAntiFavHot(game, elapsedMins, odds);
    if (anti) signals.push(anti);
  }

  return signals;
}
