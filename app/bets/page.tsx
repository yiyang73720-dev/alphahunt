'use client';

import { useState } from 'react';
import { useBets } from '@/lib/hooks';
import { Bet, SignalType } from '@/lib/types';

type BetCategory = 'all' | 'dog_ml' | 'dog_spread' | 'fav_spread';

function getBetCategory(bet: Bet): BetCategory {
  if (bet.betType === 'ML') return 'dog_ml';
  // Quality Edge is fav spread
  if (bet.signalType === 'QUALITY_EDGE') return 'fav_spread';
  return 'dog_spread';
}

export default function BetsPage() {
  const { bets, addBet, updateBet, deleteBet, summary } = useBets();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<BetCategory>('all');

  const filteredBets = filter === 'all' ? bets : bets.filter((b) => getBetCategory(b) === filter);

  // Calculate ROI by category
  const catStats = (cat: BetCategory) => {
    const catBets = bets.filter((b) => getBetCategory(b) === cat && b.outcome !== 'pending');
    if (catBets.length === 0) return null;
    const wagered = catBets.reduce((s, b) => s + b.amount, 0);
    const pnl = catBets.reduce((s, b) => s + ((b.payout || 0) - b.amount), 0);
    const wins = catBets.filter((b) => b.outcome === 'win').length;
    return {
      count: catBets.length,
      wins,
      losses: catBets.filter((b) => b.outcome === 'loss').length,
      pnl,
      roi: wagered > 0 ? (pnl / wagered) * 100 : 0,
    };
  };

  const dogMlStats = catStats('dog_ml');
  const dogSpreadStats = catStats('dog_spread');
  const favSpreadStats = catStats('fav_spread');

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Bet Tracker</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 rounded-lg bg-[#f0b90b] text-black font-bold hover:bg-[#f0b90b]/90 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Log Bet'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard
          label="Total P&L"
          value={`${summary.totalPnl >= 0 ? '+' : ''}$${summary.totalPnl.toFixed(0)}`}
          color={summary.totalPnl >= 0 ? '#16c784' : '#ea3943'}
        />
        <SummaryCard
          label="Win Rate"
          value={`${(summary.winRate * 100).toFixed(1)}%`}
          color={summary.winRate >= 0.52 ? '#16c784' : summary.winRate >= 0.48 ? '#f0b90b' : '#ea3943'}
        />
        <SummaryCard label="Total Bets" value={String(summary.totalBets)} color="#ededed" />
        <SummaryCard
          label="ROI"
          value={`${summary.roi >= 0 ? '+' : ''}${summary.roi.toFixed(1)}%`}
          color={summary.roi >= 0 ? '#16c784' : '#ea3943'}
        />
      </div>

      {/* ROI by Bet Category */}
      {(dogMlStats || dogSpreadStats || favSpreadStats) && (
        <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-4 mb-4">
          <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3">ROI by Bet Type</h3>
          <div className="space-y-2">
            {dogMlStats && (
              <CategoryRow label="Dog ML" color="#f0b90b" stats={dogMlStats} />
            )}
            {dogSpreadStats && (
              <CategoryRow label="Dog Spread" color="#3861fb" stats={dogSpreadStats} />
            )}
            {favSpreadStats && (
              <CategoryRow label="Fav Spread" color="#16c784" stats={favSpreadStats} />
            )}
          </div>
        </div>
      )}

      {/* P&L by Signal Type */}
      {Object.keys(summary.bySignalType).length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-4 mb-4">
          <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3">By Signal Type</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(summary.bySignalType).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs text-[#ededed]">{type.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[#6b7280]">{data.wins}W-{data.losses}L</span>
                  <span className={data.pnl >= 0 ? 'text-[#16c784]' : 'text-[#ea3943]'}>
                    {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-3">
        {[
          { key: 'all' as BetCategory, label: 'All', color: '#ededed' },
          { key: 'dog_ml' as BetCategory, label: 'Dog ML', color: '#f0b90b' },
          { key: 'dog_spread' as BetCategory, label: 'Dog Spread', color: '#3861fb' },
          { key: 'fav_spread' as BetCategory, label: 'Fav Spread', color: '#16c784' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              filter === f.key
                ? 'font-bold'
                : 'text-[#6b7280] border-[#2a2a3e]'
            }`}
            style={filter === f.key ? { color: f.color, borderColor: `${f.color}66`, background: `${f.color}15` } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* New Bet Form */}
      {showForm && <BetForm onSubmit={(bet) => { addBet(bet); setShowForm(false); }} />}

      {/* Bet List */}
      <div className="space-y-2">
        {filteredBets.length === 0 && !showForm && (
          <div className="text-center py-20 text-[#6b7280]">
            <div className="text-4xl mb-4">📋</div>
            {filter === 'all'
              ? <>No bets logged yet. Click &quot;+ Log Bet&quot; to start tracking.</>
              : <>No {filter.replace('_', ' ')} bets logged yet.</>
            }
          </div>
        )}
        {filteredBets.map((bet) => (
          <BetRow key={bet.id} bet={bet} onUpdate={updateBet} onDelete={deleteBet} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ label, color, stats }: { label: string; color: string; stats: { count: number; wins: number; losses: number; pnl: number; roi: number } }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="text-[#6b7280]">{stats.wins}W-{stats.losses}L</span>
        <span className={stats.pnl >= 0 ? 'text-[#16c784]' : 'text-[#ea3943]'}>
          {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(0)}
        </span>
        <span className={stats.roi >= 0 ? 'text-[#16c784]' : 'text-[#ea3943]'}>
          {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-3">
      <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold font-mono mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

function BetForm({ onSubmit }: { onSubmit: (bet: Omit<Bet, 'id'>) => void }) {
  const [team, setTeam] = useState('');
  const [game, setGame] = useState('');
  const [betType, setBetType] = useState<'ML' | 'SPREAD'>('ML');
  const [spread, setSpread] = useState('');
  const [odds, setOdds] = useState('');
  const [amount, setAmount] = useState('');
  const [signalType, setSignalType] = useState<SignalType>('DOG_LEADING');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date: new Date().toISOString().split('T')[0],
      game,
      team,
      betType,
      spread: spread ? parseFloat(spread) : undefined,
      odds: parseInt(odds),
      amount: parseFloat(amount),
      signalType,
      outcome: 'pending',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-4 mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Team" value={team} onChange={setTeam} placeholder="BOS" required />
        <Input label="Game" value={game} onChange={setGame} placeholder="BKN @ BOS" />
      </div>

      {/* Bet Type Selector — prominent toggle */}
      <div>
        <label className="text-[10px] text-[#6b7280] uppercase block mb-1">Bet Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBetType('ML')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors border ${
              betType === 'ML'
                ? 'bg-[#f0b90b]/15 border-[#f0b90b]/40 text-[#f0b90b]'
                : 'bg-[#0a0a0a] border-[#2a2a3e] text-[#6b7280]'
            }`}
          >
            Moneyline (ML)
          </button>
          <button
            type="button"
            onClick={() => setBetType('SPREAD')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors border ${
              betType === 'SPREAD'
                ? 'bg-[#3861fb]/15 border-[#3861fb]/40 text-[#3861fb]'
                : 'bg-[#0a0a0a] border-[#2a2a3e] text-[#6b7280]'
            }`}
          >
            Spread
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {betType === 'SPREAD' && (
          <Input label="Spread" value={spread} onChange={setSpread} placeholder="-5.5" />
        )}
        <Input label="Odds" value={odds} onChange={setOdds} placeholder={betType === 'ML' ? '+150' : '-110'} required />
        <Input label="Amount ($)" value={amount} onChange={setAmount} placeholder="100" required />
        {betType === 'ML' && <div />}
      </div>

      <div>
        <label className="text-[10px] text-[#6b7280] uppercase block mb-1">Signal</label>
        <select
          value={signalType}
          onChange={(e) => setSignalType(e.target.value as SignalType)}
          className="w-full bg-[#0a0a0a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-[#ededed]"
        >
          <option value="DOG_LEADING">Dog Leading</option>
          <option value="DOG_MEDIUM_FAV">Dog Medium Fav</option>
          <option value="DOG_PHYSICAL">Dog Physical</option>
          <option value="DOG_STRONG">Dog Strong</option>
          <option value="QUALITY_EDGE">Quality Edge</option>
        </select>
      </div>

      <button
        type="submit"
        className={`w-full py-2 rounded-lg font-bold text-sm transition-colors ${
          betType === 'ML'
            ? 'bg-[#f0b90b] text-black hover:bg-[#f0b90b]/90'
            : 'bg-[#3861fb] text-white hover:bg-[#3861fb]/90'
        }`}
      >
        Log {betType === 'ML' ? 'ML' : 'Spread'} Bet
      </button>
    </form>
  );
}

function Input({
  label, value, onChange, placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] text-[#6b7280] uppercase block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#0a0a0a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-[#ededed] placeholder:text-[#6b7280]/50"
      />
    </div>
  );
}

function BetRow({
  bet, onUpdate, onDelete,
}: {
  bet: Bet;
  onUpdate: (id: string, updates: Partial<Bet>) => void;
  onDelete: (id: string) => void;
}) {
  const outcomeColors = {
    win: 'text-[#16c784]',
    loss: 'text-[#ea3943]',
    push: 'text-[#f0b90b]',
    pending: 'text-[#6b7280]',
  };

  const betTypeColor = bet.betType === 'ML' ? '#f0b90b' : '#3861fb';

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-3 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${betTypeColor}20`, color: betTypeColor }}
          >
            {bet.betType}
          </span>
          <span className="text-sm font-bold">{bet.team}</span>
          {bet.betType === 'SPREAD' && bet.spread && (
            <span className="text-xs text-[#6b7280]">{bet.spread > 0 ? '+' : ''}{bet.spread}</span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2a3e] text-[#6b7280]">
            {bet.signalType.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="text-xs text-[#6b7280] mt-0.5">
          {bet.date} · {bet.game} · ${bet.amount} @ {bet.odds > 0 ? '+' : ''}{bet.odds}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {bet.outcome === 'pending' ? (
          <div className="flex gap-1">
            <button
              onClick={() => {
                const payout = bet.odds > 0 ? bet.amount * (bet.odds / 100) : bet.amount * (100 / Math.abs(bet.odds));
                onUpdate(bet.id, { outcome: 'win', payout: bet.amount + payout });
              }}
              className="text-[10px] px-2 py-1 rounded bg-[#16c784]/10 text-[#16c784] border border-[#16c784]/20 hover:bg-[#16c784]/20"
            >
              W
            </button>
            <button
              onClick={() => onUpdate(bet.id, { outcome: 'loss', payout: 0 })}
              className="text-[10px] px-2 py-1 rounded bg-[#ea3943]/10 text-[#ea3943] border border-[#ea3943]/20 hover:bg-[#ea3943]/20"
            >
              L
            </button>
            <button
              onClick={() => onUpdate(bet.id, { outcome: 'push', payout: bet.amount })}
              className="text-[10px] px-2 py-1 rounded bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/20 hover:bg-[#f0b90b]/20"
            >
              P
            </button>
          </div>
        ) : (
          <span className={`text-sm font-bold ${outcomeColors[bet.outcome]}`}>
            {bet.outcome.toUpperCase()}
          </span>
        )}
        <button
          onClick={() => onDelete(bet.id)}
          className="text-[10px] px-1.5 py-1 text-[#6b7280] hover:text-[#ea3943] transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
