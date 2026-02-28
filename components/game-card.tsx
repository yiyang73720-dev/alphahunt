'use client';

import { NBAGame, Signal, GameOdds } from '@/lib/types';

function formatClock(period: number, clock: string): string {
  if (!clock || clock === 'PT00M00.00S') {
    if (period === 0) return 'Pre-Game';
    return `End Q${Math.min(period, 4)}`;
  }
  const parts = clock.replace('PT', '').replace('S', '').split('M');
  const mins = parseInt(parts[0] || '0');
  const secs = Math.floor(parseFloat(parts[1] || '0'));
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function periodLabel(period: number): string {
  if (period <= 4) return `Q${period}`;
  return `OT${period - 4}`;
}

function getBetColor(signal: Signal): string {
  if (signal.recType === 'ML') return '#f0b90b';
  if (signal.type === 'QUALITY_EDGE') return '#16c784';
  return '#3861fb';
}

function formatOdds(odds: number | undefined): string {
  if (!odds) return '';
  return odds > 0 ? `+${odds}` : String(odds);
}

// Check if game has a STAY AWAY condition:
// fav is leading + opponent shooting hot from 3pt
function isStayAway(game: NBAGame, odds?: GameOdds): { stayAway: boolean; reason: string } {
  if (game.status !== 'live' || !odds) return { stayAway: false, reason: '' };

  const homeIsFav = odds.homeSpread < 0;
  const favTeam = homeIsFav ? game.homeTeam : game.awayTeam;
  const dogTeam = homeIsFav ? game.awayTeam : game.homeTeam;

  // Fav is leading
  if (favTeam.score <= dogTeam.score) return { stayAway: false, reason: '' };

  // Check if fav is shooting hot from 3
  if (favTeam.stats && favTeam.stats.fg3Pct > 0.40) {
    return {
      stayAway: true,
      reason: `${favTeam.abbr} leads & shooting ${(favTeam.stats.fg3Pct * 100).toFixed(0)}% from 3`,
    };
  }

  return { stayAway: false, reason: '' };
}

interface GameCardProps {
  game: NBAGame;
  signals: Signal[];
  odds?: GameOdds;
}

export default function GameCard({ game, signals, odds }: GameCardProps) {
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const hasSignals = signals.length > 0;
  const topSignal = signals[0];
  const { stayAway, reason: stayAwayReason } = isStayAway(game, odds);

  const borderClass = stayAway
    ? 'border-[#ea3943]'
    : hasSignals && topSignal
      ? topSignal.recType === 'ML'
        ? 'border-[#f0b90b] signal-glow-yellow'
        : topSignal.type === 'QUALITY_EDGE'
          ? 'border-[#16c784] signal-glow-green'
          : 'border-[#3861fb] signal-glow-blue'
      : isLive
        ? 'border-[#2a2a3e]'
        : 'border-[#1e1e30]';

  return (
    <div className={`bg-[#1a1a2e] border ${borderClass} rounded-xl p-4 transition-all`}>
      {/* STAY AWAY Warning */}
      {stayAway && (
        <div className="mb-3 -mt-1 -mx-1">
          <div className="bg-[#ea3943]/10 border border-[#ea3943]/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="text-[#ea3943] font-black text-sm">STAY AWAY</span>
            </div>
            <div className="mt-1 text-xs text-[#ea3943]/80">{stayAwayReason}</div>
          </div>
        </div>
      )}

      {/* Signal Alert Banner */}
      {hasSignals && topSignal && !stayAway && (
        <div className="mb-3 -mt-1 -mx-1">
          {(() => {
            const color = getBetColor(topSignal);
            return (
              <div
                className="rounded-lg px-3 py-2 animate-alert-pulse"
                style={{
                  background: `${color}10`,
                  border: `1px solid ${color}4d`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Bet type is the MOST prominent element */}
                    <span className="font-black text-base" style={{ color }}>
                      BET {topSignal.recType === 'ML' ? 'ML' : 'SPREAD'}
                    </span>
                    {topSignal.marketOdds && topSignal.recType === 'ML' && (
                      <span className="font-mono font-bold text-sm" style={{ color }}>
                        {formatOdds(topSignal.marketOdds)}
                      </span>
                    )}
                    {topSignal.bookSpread && topSignal.recType === 'SPREAD' && (
                      <span className="font-mono font-bold text-sm" style={{ color }}>
                        {topSignal.bookSpread > 0 ? '+' : ''}{topSignal.bookSpread}
                      </span>
                    )}
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: `${color}20`,
                        color,
                      }}
                    >
                      {topSignal.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[#16c784] font-mono text-sm font-bold">
                    ${topSignal.kellyBet}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-[#ededed]/80">
                  <span>Bet <span className="font-bold text-[#ededed]">{topSignal.betTeam}</span></span>
                  <span className="text-[#6b7280]">|</span>
                  <span>Edge {topSignal.estEdge}%</span>
                  <span className="text-[#6b7280]">|</span>
                  <span className={
                    topSignal.urgency === 'PRIME' ? 'text-[#16c784]' :
                    topSignal.urgency === 'ACT_NOW' ? 'text-[#f0b90b]' :
                    topSignal.urgency === 'CLOSING' ? 'text-[#ea3943]' :
                    'text-[#6b7280]'
                  }>
                    {topSignal.urgency}
                  </span>
                </div>
                {topSignal.type === 'QUALITY_EDGE' && (
                  <div className="mt-1 text-xs text-[#ededed]/60">
                    Quality gap: {topSignal.qualityGap}% | Trail: {topSignal.trailingBy}pts | Est spread: {topSignal.estLiveSpread}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Game Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#ea3943] rounded-full animate-pulse" />
              <span className="text-xs font-medium text-[#ea3943]">LIVE</span>
            </span>
          )}
          {isLive && (
            <span className="text-xs text-[#6b7280] font-mono">
              {periodLabel(game.period)} {formatClock(game.period, game.clock)}
            </span>
          )}
          {isFinal && <span className="text-xs font-medium text-[#6b7280]">FINAL</span>}
          {game.status === 'pre' && (
            <span className="text-xs text-[#6b7280]">
              {new Date(game.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        {odds && (
          <div className="text-xs text-[#6b7280] font-mono">
            {odds.bookmaker}
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div className="space-y-2">
        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#ededed] w-10">{game.awayTeam.abbr}</span>
            <span className="text-xs text-[#6b7280]">{game.awayTeam.record || ''}</span>
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
            <span className={`text-xl font-bold font-mono w-10 text-right ${
              game.awayTeam.score > game.homeTeam.score ? 'text-[#ededed]' : 'text-[#6b7280]'
            }`}>
              {game.status === 'pre' ? '-' : game.awayTeam.score}
            </span>
          </div>
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#ededed] w-10">{game.homeTeam.abbr}</span>
            <span className="text-xs text-[#6b7280]">{game.homeTeam.record || ''}</span>
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
            <span className={`text-xl font-bold font-mono w-10 text-right ${
              game.homeTeam.score > game.awayTeam.score ? 'text-[#ededed]' : 'text-[#6b7280]'
            }`}>
              {game.status === 'pre' ? '-' : game.homeTeam.score}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Bar (live games) */}
      {isLive && game.homeTeam.stats && game.awayTeam.stats && (
        <div className="mt-3 pt-3 border-t border-[#2a2a3e] grid grid-cols-4 gap-2 text-center">
          <StatCompare label="FG%" away={game.awayTeam.stats.fgPct} home={game.homeTeam.stats.fgPct} pct />
          <StatCompare label="3P%" away={game.awayTeam.stats.fg3Pct} home={game.homeTeam.stats.fg3Pct} pct />
          <StatCompare label="REB" away={game.awayTeam.stats.rebTotal} home={game.homeTeam.stats.rebTotal} />
          <StatCompare label="FTA" away={game.awayTeam.stats.fta} home={game.homeTeam.stats.fta} />
        </div>
      )}

      {/* Signal pills for multi-signal games */}
      {signals.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {signals.map((s) => {
            const c = getBetColor(s);
            return (
              <span
                key={s.id}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: `${c}10`,
                  color: c,
                  border: `1px solid ${c}33`,
                }}
              >
                {s.recType} · {s.type.replace(/_/g, ' ')}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCompare({ label, away, home, pct }: { label: string; away: number; home: number; pct?: boolean }) {
  const format = (v: number) => pct ? `${(v * 100).toFixed(1)}%` : String(v);
  const awayWins = away > home;
  return (
    <div className="text-[10px]">
      <div className="text-[#6b7280] mb-0.5">{label}</div>
      <div className="flex justify-center gap-1">
        <span className={awayWins ? 'text-[#16c784]' : 'text-[#6b7280]'}>{format(away)}</span>
        <span className="text-[#2a2a3e]">-</span>
        <span className={!awayWins ? 'text-[#16c784]' : 'text-[#6b7280]'}>{format(home)}</span>
      </div>
    </div>
  );
}
