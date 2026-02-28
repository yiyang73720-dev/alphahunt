import { fetchScoreboard, fetchBoxScore, fetchOdds, teamAbbrFromName, TEAM_WIN_PCT } from '../nba-api';
import { calculateSignals, getElapsedMins } from '../signals';
import { calculateDogSignals } from './dog-signals';
import {
  getState,
  setRunning,
  recordScan,
  recordError,
  isNewSignal,
  recordSignal,
  resetState,
} from './state';
import { GameOdds, NBAGame, Signal } from '../types';

// ========================================
// Scanner Configuration
// ========================================

const SCAN_INTERVAL_MS = 30_000; // 30 seconds
const GAME_HOURS_START = 19; // 7pm ET
const GAME_HOURS_END = 1; // 1am ET (next day)

// ========================================
// Active interval handle
// ========================================

let scanInterval: ReturnType<typeof setInterval> | null = null;
let lastDate: string | null = null;

// ========================================
// Check if within game hours (ET)
// ========================================

export function isGameHours(): boolean {
  // Get current ET time
  const now = new Date();
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etStr);
  const hour = etDate.getHours();

  // 7pm-midnight or midnight-1am
  return hour >= GAME_HOURS_START || hour < GAME_HOURS_END;
}

// ========================================
// Main scan cycle
// ========================================

async function runScanCycle(): Promise<{ signals: Signal[]; newSignals: Signal[] }> {
  const allSignals: Signal[] = [];
  const newSignals: Signal[] = [];

  try {
    // Reset state at day boundary
    const today = new Date().toISOString().slice(0, 10);
    if (lastDate && lastDate !== today) {
      resetState();
    }
    lastDate = today;

    // 1. Fetch scoreboard + odds in parallel
    const [games, oddsArr] = await Promise.all([
      fetchScoreboard(),
      fetchOdds(),
    ]);

    // 2. Build odds map keyed by game
    const oddsMap: Record<string, GameOdds> = {};
    for (const game of games) {
      const matchingOdds = oddsArr.find((o) => {
        const homeAbbr = teamAbbrFromName(o.homeTeam);
        const awayAbbr = teamAbbrFromName(o.awayTeam);
        return homeAbbr === game.homeTeam.abbr && awayAbbr === game.awayTeam.abbr;
      });
      if (matchingOdds) {
        oddsMap[game.gameId] = matchingOdds;
      }
    }

    // 3. Fetch box scores for live games
    const liveGames = games.filter((g) => g.status === 'live');
    const topScorersMap: Record<string, { name: string; teamAbbr: string; points: number; minutes: number }[]> = {};

    const boxScores = await Promise.all(
      liveGames.map((g) => fetchBoxScore(g.gameId))
    );

    for (let i = 0; i < liveGames.length; i++) {
      const game = liveGames[i];
      const box = boxScores[i];
      if (!box) continue;

      // Update game stats from box score
      if (box.homeTeam?.stats) {
        const s = box.homeTeam.stats;
        game.homeTeam.stats = {
          fgm: s.fieldGoalsMade || 0, fga: s.fieldGoalsAttempted || 0,
          fgPct: s.fieldGoalsPercentage || 0, fg3m: s.threePointersMade || 0,
          fg3a: s.threePointersAttempted || 0, fg3Pct: s.threePointersPercentage || 0,
          ftm: s.freeThrowsMade || 0, fta: s.freeThrowsAttempted || 0,
          ftPct: s.freeThrowsPercentage || 0, rebOff: s.reboundsOffensive || 0,
          rebDef: s.reboundsDefensive || 0, rebTotal: s.reboundsTotal || 0,
          assists: s.assists || 0, steals: s.steals || 0, blocks: s.blocks || 0,
          turnovers: s.turnovers || 0, pf: s.foulsPersonal || 0, pts: s.points || 0,
        };
      }
      if (box.awayTeam?.stats) {
        const s = box.awayTeam.stats;
        game.awayTeam.stats = {
          fgm: s.fieldGoalsMade || 0, fga: s.fieldGoalsAttempted || 0,
          fgPct: s.fieldGoalsPercentage || 0, fg3m: s.threePointersMade || 0,
          fg3a: s.threePointersAttempted || 0, fg3Pct: s.threePointersPercentage || 0,
          ftm: s.freeThrowsMade || 0, fta: s.freeThrowsAttempted || 0,
          ftPct: s.freeThrowsPercentage || 0, rebOff: s.reboundsOffensive || 0,
          rebDef: s.reboundsDefensive || 0, rebTotal: s.reboundsTotal || 0,
          assists: s.assists || 0, steals: s.steals || 0, blocks: s.blocks || 0,
          turnovers: s.turnovers || 0, pf: s.foulsPersonal || 0, pts: s.points || 0,
        };
      }

      // Build top scorers from player stats
      const allPlayers = [
        ...(box.homePlayers || []).map((p: { name: string; points: number; minutes: string }) => ({
          ...p, teamAbbr: game.homeTeam.abbr,
        })),
        ...(box.awayPlayers || []).map((p: { name: string; points: number; minutes: string }) => ({
          ...p, teamAbbr: game.awayTeam.abbr,
        })),
      ];
      topScorersMap[game.gameId] = allPlayers
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map((p) => ({
          name: p.name, teamAbbr: p.teamAbbr,
          points: p.points, minutes: parseFloat(p.minutes) || 0,
        }));
    }

    // 4. Calculate existing signals (star coil, quality edge, old dog physical)
    const existingSignals = calculateSignals(games, oddsMap, topScorersMap, TEAM_WIN_PCT);
    allSignals.push(...existingSignals);

    // 5. Calculate new dog signals (with hybrid ML/spread betType)
    for (const game of liveGames) {
      if (game.status !== 'live') continue;
      const elapsedMins = getElapsedMins(game.period, game.clock);
      const odds = oddsMap[game.gameId];

      const dogSignal = calculateDogSignals(game, elapsedMins, odds);
      if (dogSignal) {
        const existingIdx = allSignals.findIndex(
          (s) => s.gameId === game.gameId && (
            s.type === 'DOG_PHYSICAL' || s.type === 'DOG_LEADING' ||
            s.type === 'DOG_MEDIUM_FAV' || s.type === 'DOG_STRONG'
          )
        );
        if (existingIdx >= 0) {
          allSignals[existingIdx] = dogSignal;
        } else {
          allSignals.push(dogSignal);
        }
      }
    }

    // 6. Check for new signals and trigger alerts
    for (const signal of allSignals) {
      if (isNewSignal(signal)) {
        newSignals.push(signal);

        // Send alert
        let alertSent = false;
        try {
          const alertRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/alerts`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signal }),
            }
          );
          alertSent = alertRes.ok;
        } catch {
          // Alert endpoint may not be ready yet
        }

        recordSignal(signal, alertSent);
      }
    }

    recordScan();
  } catch (err) {
    recordError(String(err));
  }

  return { signals: allSignals, newSignals };
}

// ========================================
// Start / Stop the scanner
// ========================================

export function startScanner(): { started: boolean; message: string } {
  const state = getState();
  if (state.isRunning) {
    return { started: false, message: 'Scanner is already running' };
  }

  setRunning(true);

  // Run immediately, then every SCAN_INTERVAL_MS
  runScanCycle();

  scanInterval = setInterval(() => {
    if (!getState().isRunning) {
      stopScanner();
      return;
    }
    runScanCycle();
  }, SCAN_INTERVAL_MS);

  return { started: true, message: `Scanner started, polling every ${SCAN_INTERVAL_MS / 1000}s` };
}

export function stopScanner(): { stopped: boolean; message: string } {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  setRunning(false);
  return { stopped: true, message: 'Scanner stopped' };
}

// Force a single scan (for testing / manual trigger)
export async function runOnce() {
  return runScanCycle();
}
