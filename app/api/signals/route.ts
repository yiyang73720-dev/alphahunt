import { NextResponse } from 'next/server';
import { fetchScoreboard, fetchBoxScore, fetchOdds, teamAbbrFromName, TEAM_WIN_PCT } from '@/lib/nba-api';
import { calculateSignals, getElapsedMins } from '@/lib/signals';
import { calculateDogSignals } from '@/lib/scanner/dog-signals';
import { GameOdds, NBAGame } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [games, oddsArr] = await Promise.all([
      fetchScoreboard(),
      fetchOdds(),
    ]);

    // Build odds map keyed by matching teams
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

    // Fetch box scores for live games & build top scorers map
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
          fgm: s.fieldGoalsMade || 0,
          fga: s.fieldGoalsAttempted || 0,
          fgPct: s.fieldGoalsPercentage || 0,
          fg3m: s.threePointersMade || 0,
          fg3a: s.threePointersAttempted || 0,
          fg3Pct: s.threePointersPercentage || 0,
          ftm: s.freeThrowsMade || 0,
          fta: s.freeThrowsAttempted || 0,
          ftPct: s.freeThrowsPercentage || 0,
          rebOff: s.reboundsOffensive || 0,
          rebDef: s.reboundsDefensive || 0,
          rebTotal: s.reboundsTotal || 0,
          assists: s.assists || 0,
          steals: s.steals || 0,
          blocks: s.blocks || 0,
          turnovers: s.turnovers || 0,
          pf: s.foulsPersonal || 0,
          pts: s.points || 0,
        };
      }
      if (box.awayTeam?.stats) {
        const s = box.awayTeam.stats;
        game.awayTeam.stats = {
          fgm: s.fieldGoalsMade || 0,
          fga: s.fieldGoalsAttempted || 0,
          fgPct: s.fieldGoalsPercentage || 0,
          fg3m: s.threePointersMade || 0,
          fg3a: s.threePointersAttempted || 0,
          fg3Pct: s.threePointersPercentage || 0,
          ftm: s.freeThrowsMade || 0,
          fta: s.freeThrowsAttempted || 0,
          ftPct: s.freeThrowsPercentage || 0,
          rebOff: s.reboundsOffensive || 0,
          rebDef: s.reboundsDefensive || 0,
          rebTotal: s.reboundsTotal || 0,
          assists: s.assists || 0,
          steals: s.steals || 0,
          blocks: s.blocks || 0,
          turnovers: s.turnovers || 0,
          pf: s.foulsPersonal || 0,
          pts: s.points || 0,
        };
      }

      // Build top scorers from player stats
      const allPlayers = [
        ...(box.homePlayers || []).map((p: { name: string; points: number; minutes: string }) => ({
          ...p,
          teamAbbr: game.homeTeam.abbr,
        })),
        ...(box.awayPlayers || []).map((p: { name: string; points: number; minutes: string }) => ({
          ...p,
          teamAbbr: game.awayTeam.abbr,
        })),
      ];

      topScorersMap[game.gameId] = allPlayers
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map((p) => ({
          name: p.name,
          teamAbbr: p.teamAbbr,
          points: p.points,
          minutes: parseFloat(p.minutes) || 0,
        }));
    }

    const signals = calculateSignals(games, oddsMap, topScorersMap, TEAM_WIN_PCT);

    // Add dog signals (with hybrid ML/spread betType)
    for (const game of liveGames) {
      const elapsedMins = getElapsedMins(game.period, game.clock);
      const odds = oddsMap[game.gameId];
      const dogSignal = calculateDogSignals(game, elapsedMins, odds);
      if (dogSignal) {
        // Replace any existing dog signal for this game with the research-based one
        const existingIdx = signals.findIndex(
          (s) => s.gameId === game.gameId && (
            s.type === 'DOG_PHYSICAL' || s.type === 'DOG_LEADING' ||
            s.type === 'DOG_MEDIUM_FAV' || s.type === 'DOG_STRONG'
          )
        );
        if (existingIdx >= 0) {
          signals[existingIdx] = dogSignal;
        } else {
          signals.push(dogSignal);
        }
      }
    }

    return NextResponse.json({
      games,
      signals,
      oddsMap,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Signals calculation error:', error);
    return NextResponse.json({ games: [], signals: [], error: String(error) }, { status: 500 });
  }
}
