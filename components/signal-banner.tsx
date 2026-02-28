'use client';

import { Signal } from '@/lib/types';

interface SignalBannerProps {
  signals: Signal[];
}

function getBetTypeColor(signal: Signal): string {
  if (signal.recType === 'ML') return '#f0b90b'; // gold for ML
  if (signal.type === 'QUALITY_EDGE') return '#16c784'; // green for fav spread
  return '#3861fb'; // blue for dog spread
}

function getBetTypeLabel(signal: Signal): string {
  if (signal.recType === 'ML') return 'ML';
  return 'SPREAD';
}

function getBetReason(signal: Signal): string | null {
  if (signal.recType === 'ML' && signal.marketOdds && signal.marketOdds >= 100) {
    return `Plus money available (+${signal.marketOdds})`;
  }
  if (signal.recType === 'ML') return 'ML has better edge';
  if (signal.recType === 'SPREAD') return 'Spread has better edge';
  return null;
}

function formatOdds(odds: number | undefined): string {
  if (!odds) return '';
  return odds > 0 ? `+${odds}` : String(odds);
}

export default function SignalBanner({ signals }: SignalBannerProps) {
  if (signals.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {signals.map((signal) => {
        const color = getBetTypeColor(signal);
        const betLabel = getBetTypeLabel(signal);
        const reason = getBetReason(signal);

        return (
          <div
            key={signal.id}
            className="rounded-xl p-4 animate-alert-pulse"
            style={{
              background: `linear-gradient(to right, ${color}15, ${color}05)`,
              border: `1px solid ${color}66`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  {/* Bet type is the MOST PROMINENT element */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-black text-xl tracking-tight"
                      style={{ color }}
                    >
                      BET {betLabel}
                    </span>
                    {signal.marketOdds && (
                      <span
                        className="font-mono font-bold text-lg"
                        style={{ color }}
                      >
                        {formatOdds(signal.marketOdds)}
                      </span>
                    )}
                    {signal.bookSpread && signal.recType === 'SPREAD' && (
                      <span
                        className="font-mono font-bold text-lg"
                        style={{ color }}
                      >
                        {signal.bookSpread > 0 ? '+' : ''}{signal.bookSpread}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-[#ededed]/70">{signal.game}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{
                        background: `${color}20`,
                        color,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      {signal.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#16c784] font-mono">${signal.kellyBet}</div>
                <div className="text-xs text-[#6b7280]">{signal.kellyPct}% of bankroll</div>
              </div>
            </div>

            {/* Reason badge */}
            {reason && (
              <div className="mb-2">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: `${color}15`,
                    color: `${color}`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {reason}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-[#6b7280]">Bet </span>
                <span className="font-bold text-[#ededed]">{signal.betTeam}</span>
                <span className="text-[#6b7280]"> {signal.recType}</span>
              </div>
              <div>
                <span className="text-[#6b7280]">Edge </span>
                <span className="text-[#16c784] font-mono">{signal.estEdge}%</span>
              </div>
              <div>
                <span className="text-[#6b7280]">Win prob </span>
                <span className="text-[#ededed] font-mono">{signal.estWinProb}%</span>
              </div>
              <div>
                <span className={
                  signal.urgency === 'PRIME' ? 'text-[#16c784] font-bold' :
                  signal.urgency === 'ACT_NOW' ? 'text-[#f0b90b] font-bold' :
                  signal.urgency === 'CLOSING' ? 'text-[#ea3943] font-bold' :
                  'text-[#6b7280]'
                }>
                  {signal.urgency}
                </span>
              </div>
              <div>
                <span className="text-[#6b7280]">{signal.elapsedMins}min elapsed</span>
              </div>
            </div>

            {signal.type === 'QUALITY_EDGE' && (
              <div className="mt-2 text-xs text-[#ededed]/50 bg-[#0a0a0a]/30 rounded-lg px-3 py-1.5">
                Quality gap: {signal.qualityGap}% | Trailing by {signal.trailingBy}pts | Book spread: {signal.bookSpread} | Est live: {signal.estLiveSpread}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
