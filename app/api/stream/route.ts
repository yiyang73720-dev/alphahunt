import { NextRequest } from 'next/server';
import { fetchScoreboard, fetchOdds, fetchBoxScore, teamAbbrFromName, TEAM_WIN_PCT } from '@/lib/nba-api';
import { calculateSignals, getElapsedMins } from '@/lib/signals';
import { calculateDogSignals } from '@/lib/scanner/dog-signals';
import { GameOdds } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let running = true;

      request.signal.addEventListener('abort', () => {
        running = false;
      });

      while (running) {
        try {
          const [games, oddsArr] = await Promise.all([
            fetchScoreboard(),
            fetchOdds(),
          ]);

          // Build odds map
          const oddsMap: Record<string, GameOdds> = {};
          for (const game of games) {
            const match = oddsArr.find((o) => {
              const hA = teamAbbrFromName(o.homeTeam);
              const aA = teamAbbrFromName(o.awayTeam);
              return hA === game.homeTeam.abbr && aA === game.awayTeam.abbr;
            });
            if (match) oddsMap[game.gameId] = match;
          }

          // Fetch box scores for live games
          const liveGames = games.filter((g) => g.status === 'live');
          const topScorersMap: Record<string, { name: string; teamAbbr: string; points: number; minutes: number }[]> = {};

          const boxes = await Promise.all(liveGames.map((g) => fetchBoxScore(g.gameId)));
          for (let i = 0; i < liveGames.length; i++) {
            const game = liveGames[i];
            const box = boxes[i];
            if (!box) continue;

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

            const allPlayers = [
              ...(box.homePlayers || []).map((p: { name: string; points: number; minutes: string }) => ({ ...p, teamAbbr: game.homeTeam.abbr })),
              ...(box.awayPlayers || []).map((p: { name: string; points: number; minutes: string }) => ({ ...p, teamAbbr: game.awayTeam.abbr })),
            ];
            topScorersMap[game.gameId] = allPlayers
              .sort((a, b) => b.points - a.points)
              .slice(0, 10)
              .map((p) => ({ name: p.name, teamAbbr: p.teamAbbr, points: p.points, minutes: parseFloat(p.minutes) || 0 }));
          }

          const signals = calculateSignals(games, oddsMap, topScorersMap, TEAM_WIN_PCT);

          // Add dog signals (with hybrid ML/spread betType)
          for (const game of liveGames) {
            const elapsedMins = getElapsedMins(game.period, game.clock);
            const odds = oddsMap[game.gameId];
            const dogSignal = calculateDogSignals(game, elapsedMins, odds);
            if (dogSignal) {
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

          sendEvent({ games, signals, oddsMap, timestamp: new Date().toISOString() });
        } catch (err) {
          sendEvent({ error: String(err), timestamp: new Date().toISOString() });
        }

        // Wait 30 seconds before next update
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
