'use client';

import { useLiveData } from '@/lib/hooks';
import GameCard from '@/components/game-card';
import SignalBanner from '@/components/signal-banner';
import { NBAGame, Signal, GameOdds } from '@/lib/types';
import { teamAbbrFromName } from '@/lib/nba-api';

export default function Dashboard() {
  const { games, signals, odds, lastUpdate, isLive, loading, error, refresh } = useLiveData();

  // Match odds to games
  const getOddsForGame = (game: NBAGame): GameOdds | undefined => {
    return Object.values(odds).find((o: GameOdds) => {
      const hA = teamAbbrFromName(o.homeTeam);
      const aA = teamAbbrFromName(o.awayTeam);
      return hA === game.homeTeam.abbr && aA === game.awayTeam.abbr;
    });
  };

  const getSignalsForGame = (game: NBAGame): Signal[] => {
    return signals.filter((s) => s.gameId === game.gameId);
  };

  // Sort: live with signals first, then live, then pre, then final
  const sortedGames = [...games].sort((a, b) => {
    const aSignals = getSignalsForGame(a).length;
    const bSignals = getSignalsForGame(b).length;
    if (aSignals !== bSignals) return bSignals - aSignals;
    const statusOrder = { live: 0, pre: 1, final: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const liveGames = sortedGames.filter((g) => g.status === 'live');
  const preGames = sortedGames.filter((g) => g.status === 'pre');
  const finalGames = sortedGames.filter((g) => g.status === 'final');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">◎</div>
          <div className="text-[#6b7280]">Loading games...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span className="text-[#f0b90b]">ALPHA</span>
            <span>HUNT</span>
            {isLive && (
              <span className="flex items-center gap-1 ml-2">
                <span className="w-2 h-2 bg-[#ea3943] rounded-full animate-pulse" />
                <span className="text-xs text-[#ea3943] font-medium">LIVE</span>
              </span>
            )}
          </h1>
          <div className="text-xs text-[#6b7280] mt-0.5">
            {games.length} games today
            {lastUpdate && ` · Updated ${new Date(lastUpdate).toLocaleTimeString()}`}
          </div>
        </div>
        <button
          onClick={refresh}
          className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] text-[#6b7280] hover:text-[#ededed] transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-[#ea3943]/10 border border-[#ea3943]/30 text-sm text-[#ea3943]">
          {error}
        </div>
      )}

      {/* Bet type legend */}
      {signals.length > 0 && (
        <div className="flex items-center gap-4 mb-3 px-1 text-xs text-[#6b7280]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f0b90b]" />
            <span>ML Bet</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3861fb]" />
            <span>Spread Bet</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ea3943]" />
            <span>Stay Away</span>
          </span>
        </div>
      )}

      {/* Active Signal Banners */}
      <SignalBanner signals={signals} />

      {/* Live Games */}
      {liveGames.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#ea3943] rounded-full animate-pulse" />
            Live ({liveGames.length})
          </h2>
          <div className="grid gap-3">
            {liveGames.map((game) => (
              <GameCard
                key={game.gameId}
                game={game}
                signals={getSignalsForGame(game)}
                odds={getOddsForGame(game)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Games */}
      {preGames.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3">
            Upcoming ({preGames.length})
          </h2>
          <div className="grid gap-3">
            {preGames.map((game) => (
              <GameCard
                key={game.gameId}
                game={game}
                signals={[]}
                odds={getOddsForGame(game)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Final Games */}
      {finalGames.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3">
            Final ({finalGames.length})
          </h2>
          <div className="grid gap-3">
            {finalGames.map((game) => (
              <GameCard
                key={game.gameId}
                game={game}
                signals={[]}
                odds={getOddsForGame(game)}
              />
            ))}
          </div>
        </section>
      )}

      {/* No games */}
      {games.length === 0 && !loading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="text-4xl mb-4">🏀</div>
            <div className="text-[#6b7280]">No NBA games today</div>
            <div className="text-xs text-[#6b7280] mt-1">Check back on game day</div>
          </div>
        </div>
      )}
    </div>
  );
}
