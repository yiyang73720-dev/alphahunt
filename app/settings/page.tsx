'use client';

import { useSettings } from '@/lib/hooks';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="max-w-xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold mb-4">Settings</h1>

      <div className="space-y-4">
        {/* Contact Info */}
        <Section title="Alert Contact">
          <SettingInput
            label="Email address"
            value={settings.email}
            onChange={(v) => updateSettings({ email: v })}
            placeholder="you@email.com"
            type="email"
          />
          <SettingInput
            label="Phone number"
            value={settings.phone}
            onChange={(v) => updateSettings({ phone: v })}
            placeholder="+1 555-555-5555"
            type="tel"
          />
        </Section>

        {/* Bankroll */}
        <Section title="Bankroll">
          <SettingInput
            label="Bankroll amount ($)"
            value={String(settings.bankroll)}
            onChange={(v) => updateSettings({ bankroll: parseInt(v) || 20000 })}
            placeholder="20000"
            type="number"
          />
          <div className="text-xs text-[#6b7280] mt-1">
            Kelly bet sizes are calculated as a percentage of this amount.
            Half-Kelly is used with a 5% maximum bet size.
          </div>
        </Section>

        {/* Alert Preferences */}
        <Section title="Alert Preferences">
          <Toggle
            label="Email alerts"
            description="Send email when signals fire"
            checked={settings.alertPreferences.emailAlerts}
            onChange={(v) =>
              updateSettings({
                alertPreferences: { ...settings.alertPreferences, emailAlerts: v },
              })
            }
          />
          <Toggle
            label="Phone call alerts"
            description="Call your phone for high-confidence signals"
            checked={settings.alertPreferences.phoneAlerts}
            onChange={(v) =>
              updateSettings({
                alertPreferences: { ...settings.alertPreferences, phoneAlerts: v },
              })
            }
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#6b7280] uppercase block mb-1">
                Min signals to alert
              </label>
              <select
                value={settings.alertPreferences.minSignalCount}
                onChange={(e) =>
                  updateSettings({
                    alertPreferences: {
                      ...settings.alertPreferences,
                      minSignalCount: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#0a0a0a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-[#ededed]"
              >
                <option value="1">1 signal (all alerts)</option>
                <option value="2">2+ signals</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#6b7280] uppercase block mb-1">
                Min edge to alert
              </label>
              <select
                value={settings.alertPreferences.minEdge}
                onChange={(e) =>
                  updateSettings({
                    alertPreferences: {
                      ...settings.alertPreferences,
                      minEdge: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#0a0a0a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-[#ededed]"
              >
                <option value="3">3%+ (standard)</option>
                <option value="3.5">3.5%+ (selective)</option>
                <option value="4">4%+ (high confidence only)</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Hybrid Strategy Guide */}
        <Section title="Hybrid ML/Spread Strategy">
          <div className="space-y-3 text-sm">
            {/* Decision Rule */}
            <div className="bg-[#0a0a0a]/50 rounded-lg p-3 border border-[#2a2a3e]">
              <div className="text-xs font-bold text-[#ededed] mb-2 uppercase tracking-wider">Decision Rule</div>
              <div className="space-y-1.5 text-xs text-[#6b7280]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f0b90b]" />
                  <span><span className="text-[#f0b90b] font-bold">BET ML</span> when dog ML is +100 or better (plus money)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3861fb]" />
                  <span><span className="text-[#3861fb] font-bold">BET SPREAD</span> when dog ML is worse than -100 (juice too high)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ea3943]" />
                  <span><span className="text-[#ea3943] font-bold">STAY AWAY</span> when fav leads + shooting hot from 3pt</span>
                </div>
              </div>
            </div>

            {/* Dog Signals */}
            <SignalInfo
              name="Dog Leading"
              color="#f0b90b"
              desc="Underdog leading in Q2+. The foundation signal for all dog plays."
              stats="66.6% cover, 27.2% ROI, z=32.88 (9,801 games)"
            />
            <SignalInfo
              name="Dog Medium Fav"
              color="#f0b90b"
              desc="Dog leading vs medium favorite (spread 3.5-7). Sweet spot for dog ML value."
              stats="70.0% cover, 33.6% ROI, z=24.23 (3,685 games)"
            />
            <SignalInfo
              name="Dog Physical"
              color="#f0b90b"
              desc="Dog leading + winning rebounds. Physical dominance = sustainable lead."
              stats="67.2% cover, 28.3% ROI, z=26.85 (6,075 games)"
            />
            <SignalInfo
              name="Dog Strong"
              color="#f0b90b"
              desc="Dog leading 5+ with both REB and FTA advantages. Strongest signal."
              stats="72.5% cover, 38.4% ROI, z=20.17 (2,005 games)"
            />
            <SignalInfo
              name="Quality Edge"
              color="#16c784"
              desc="Significantly stronger team (15%+ win% gap) trailing 1-10pts in Q1-Q2. Fav spread bet."
              stats="72% spread cover rate in backtest"
            />

            {/* Stay Away */}
            <div className="border-l-2 border-[#ea3943] pl-3">
              <div className="font-bold text-sm text-[#ea3943]">STAY AWAY (Anti-Signal)</div>
              <div className="text-xs text-[#6b7280] mt-0.5">
                When the favorite is leading AND shooting above 40% from 3pt, do not bet the dog.
                Hot 3pt shooting makes comebacks significantly harder. Wait for the shooting to regress
                before entering any dog position.
              </div>
            </div>
          </div>
        </Section>

        {/* Kelly Formula */}
        <Section title="Bet Sizing (Kelly Criterion)">
          <div className="text-xs text-[#6b7280] space-y-2">
            <p>Base edge = 3.5% + 1% per additional signal (capped at 8%)</p>
            <p>Win probability = min(90%, implied probability + edge)</p>
            <p>Half-Kelly fraction = (b*p - q) / (2*b), capped at 5% of bankroll</p>
            <p>Urgency multiplier: DEVELOPING 0.7x, PRIME 1.0x, ACT_NOW 0.85x, CLOSING 0.5x</p>
            <p>Minimum edge threshold: 3% (no bet below this)</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-4">
      <h2 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

function SettingInput({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="mb-3">
      <label className="text-sm text-[#ededed] block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="w-full bg-[#0a0a0a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-[#ededed] placeholder:text-[#6b7280]/50"
      />
    </div>
  );
}

function Toggle({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm text-[#ededed]">{label}</div>
        <div className="text-xs text-[#6b7280]">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${
          checked ? 'bg-[#16c784]' : 'bg-[#2a2a3e]'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SignalInfo({
  name, color, desc, stats,
}: {
  name: string; color: string; desc: string; stats: string;
}) {
  return (
    <div className="border-l-2 pl-3" style={{ borderColor: color }}>
      <div className="font-bold text-sm" style={{ color }}>{name}</div>
      <div className="text-xs text-[#6b7280] mt-0.5">{desc}</div>
      <div className="text-[10px] text-[#ededed]/40 mt-0.5 font-mono">{stats}</div>
    </div>
  );
}
