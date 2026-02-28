'use client';

import { useState, useEffect } from 'react';
import { NBAGame, GameOdds } from '@/lib/types';
import { teamAbbrFromName, TEAM_WIN_PCT } from '@/lib/nba-api';

interface TonightGame {
  game: NBAGame;
  odds?: GameOdds;
  homeWinPct: number;
  awayWinPct: number;
  spread: number;
  isDogWatch: boolean;
  isBigFav: boolean;
  dogML: number | null;
}

export default function TonightPage() {
  const [tonightGames, setTonightGames] = useState<TonightGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [scoresRes, oddsRes] = await Promise.all([
          fetch('/api/scores'),
          fetch('/api/odds'),
        ]);
        const scoresData = await scoresRes.json();
        const oddsData = await oddsRes.json();

        const games: NBAGame[] = scoresData.games || [];
        const oddsArr: GameOdds[] = oddsData.odds || [];

        const enriched: TonightGame[] = games.map((game) => {
          const matchOdds = oddsArr.find((o) => {
            const hA = teamAbbrFromName(o.homeTeam);
            const aA = teamAbbrFromName(o.awayTeam);
            return hA === game.homeTeam.abbr && aA === game.awayTeam.abbr;
          });

          const homeWinPct = TEAM_WIN_PCT[game.homeTeam.abbr] || 50;
          const awayWinPct = TEAM_WIN_PCT[game.awayTeam.abbr] || 50;
          const spread = matchOdds ? Math.abs(matchOdds.homeSpread) : 0;

          // Determine dog ML
          let dogML: number | null = null;
          if (matchOdds) {
            const homeIsFav = matchOdds.homeSpread < 0;
            dogML = homeIsFav ? matchOdds.awayML : matchOdds.homeML;
          }

          return {
            game,
            odds: matchOdds,
            homeWinPct,
            awayWinPct,
            spread,
            isDogWatch: spread > 0 && spread <= 3.5,
            isBigFav: spread >= 7,
            dogML,
          };
        });

        setTonightGames(enriched);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const dogWatchGames = tonightGames.filter((g) => g.isDogWatch);
  const bigFavGames = tonightGames.filter((g) => g.isBigFav);
  const otherGames = tonightGames.filter((g) => !g.isDogWatch && !g.isBigFav);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[#6b7280]">Loading tonight&apos;s schedule...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold mb-1">Tonight&apos;s Games</h1>
      <p className="text-xs text-[#6b7280] mb-4">
        {tonightGames.length} games scheduled
      </p>

      {/* Dogs to Watch */}
      {dogWatchGames.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🐕</span>
            <h2 className="text-sm font-bold text-[#f0b90b]">DOGS TO WATCH</h2>
            <span className="text-xs text-[#6b7280]">Spread &le; 3.5 — potential live dog value</span>
          </div>
          <div className="grid gap-3">
            {dogWatchGames.map((tg) => (
              <TonightCard key={tg.game.gameId} data={tg} />
            ))}
          </div>
        </section>
      )}

      {/* Big Fav Games */}
      {bigFavGames.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">📊</span>
            <h2 className="text-sm font-bold text-[#3861fb]">BIG FAV GAMES</h2>
            <span className="text-xs text-[#6b7280]">Spread &ge; 7 — Quality Edge territory</span>
          </div>
          <div className="grid gap-3">
            {bigFavGames.map((tg) => (
              <TonightCard key={tg.game.gameId} data={tg} />
            ))}
          </div>
        </section>
      )}

      {/* Other Games */}
      {otherGames.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3">
            Other Games ({otherGames.length})
          </h2>
          <div className="grid gap-3">
            {otherGames.map((tg) => (
              <TonightCard key={tg.game.gameId} data={tg} />
            ))}
          </div>
        </section>
      )}

      {tonightGames.length === 0 && (
        <div className="text-center py-20 text-[#6b7280]">
          <div className="text-4xl mb-4">📅</div>
          No games scheduled tonight
        </div>
      )}
    </div>
  );
}

function TonightCard({ data }: { data: TonightGame }) {
  const { game, odds, homeWinPct, awayWinPct, dogML } = data;
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const hasPlusMoney = dogML !== null && dogML >= 150;

  return (
    <div className={`bg-[#1a1a2e] border rounded-xl p-4 ${
      hasPlusMoney ? 'border-[#f0b90b]/40' : 'border-[#2a2a3e]'
    }`}
    style={hasPlusMoney ? { boxShadow: '0 0 12px rgba(240, 185, 11, 0.08)' } : undefined}
    >
      {/* Time / Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#ea3943] rounded-full animate-pulse" />
              <span className="text-xs text-[#ea3943]">LIVE</span>
            </span>
          )}
          {isFinal && <span className="text-xs text-[#6b7280]">FINAL</span>}
          {game.status === 'pre' && (
            <span className="text-xs text-[#6b7280]">
              {new Date(game.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {data.isDogWatch && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/20">
              DOG WATCH
            </span>
          )}
          {data.isBigFav && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3861fb]/10 text-[#3861fb] border border-[#3861fb]/20">
              BIG FAV
            </span>
          )}
          {hasPlusMoney && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0b90b]/15 text-[#f0b90b] border border-[#f0b90b]/30 font-bold">
              ML +{dogML}
            </span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold w-10">{game.awayTeam.abbr}</span>
            <span className="text-xs text-[#6b7280]">{awayWinPct}%</span>
          </div>
          <div className="flex items-center gap-4">
            {odds && (
              <div className="flex gap-3 text-xs font-mono">
                <span className="text-[#6b7280]">{odds.awaySpread > 0 ? '+' : ''}{odds.awaySpread}</span>
                <span className={odds.awayML > 0 ? 'text-[#f0b90b] font-bold' : 'text-[#6b7280]'}>
                  {odds.awayML > 0 ? '+' : ''}{odds.awayML}
                </span>
              </div>
            )}
            <span className="text-lg font-bold font-mono w-8 text-right">
              {game.status !== 'pre' ? game.awayTeam.score : '-'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold w-10">{game.homeTeam.abbr}</span>
            <span className="text-xs text-[#6b7280]">{homeWinPct}%</span>
          </div>
          <div className="flex items-center gap-4">
            {odds && (
              <div className="flex gap-3 text-xs font-mono">
                <span className="text-[#6b7280]">{odds.homeSpread > 0 ? '+' : ''}{odds.homeSpread}</span>
                <span className={odds.homeML > 0 ? 'text-[#f0b90b] font-bold' : 'text-[#6b7280]'}>
                  {odds.homeML > 0 ? '+' : ''}{odds.homeML}
                </span>
              </div>
            )}
            <span className="text-lg font-bold font-mono w-8 text-right">
              {game.status !== 'pre' ? game.homeTeam.score : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* ML value indicator for dogs */}
      {dogML !== null && dogML > 0 && (
        <div className="mt-3 pt-2 border-t border-[#2a2a3e] text-xs">
          <span className="text-[#6b7280]">Dog ML: </span>
          <span className={`font-mono font-bold ${dogML >= 150 ? 'text-[#f0b90b]' : 'text-[#ededed]'}`}>
            +{dogML}
          </span>
          {dogML >= 150 && (
            <span className="ml-2 text-[#f0b90b]">
              — Good ML value, watch for live dog play
            </span>
          )}
          {dogML > 0 && dogML < 150 && (
            <span className="ml-2 text-[#6b7280]">
              — Likely spread bet territory if signal fires
            </span>
          )}
        </div>
      )}

      {/* Quality gap indicator */}
      {Math.abs(homeWinPct - awayWinPct) >= 15 && (
        <div className={`${dogML !== null && dogML > 0 ? 'mt-2' : 'mt-3 pt-2 border-t border-[#2a2a3e]'} text-xs text-[#6b7280]`}>
          Quality gap: <span className="text-[#ededed] font-mono">{Math.abs(homeWinPct - awayWinPct).toFixed(1)}%</span>
          <span className="ml-2 text-[#3861fb]">
            — Quality Edge eligible if {homeWinPct > awayWinPct ? game.homeTeam.abbr : game.awayTeam.abbr} trails Q1-Q2
          </span>
        </div>
      )}
    </div>
  );
}
