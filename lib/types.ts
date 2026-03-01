// ========================================
// Core NBA Data Types
// ========================================

export interface NBAGame {
  gameId: string;
  status: 'pre' | 'live' | 'final';
  period: number;
  clock: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  startTime: string;
  arena?: string;
  broadcast?: string;
  sustainability?: import('./sustainability').SustainabilityMetrics;
}

export interface TeamInfo {
  teamId: string;
  abbr: string;
  name: string;
  city: string;
  score: number;
  record?: string;
  stats?: BoxScoreStats;
}

export interface BoxScoreStats {
  fgm: number;
  fga: number;
  fgPct: number;
  fg3m: number;
  fg3a: number;
  fg3Pct: number;
  ftm: number;
  fta: number;
  ftPct: number;
  rebOff: number;
  rebDef: number;
  rebTotal: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  pf: number;
  pts: number;
}

// ========================================
// Odds Types
// ========================================

export interface GameOdds {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeSpread: number;
  awaySpread: number;
  homeML: number;
  awayML: number;
  bookmaker: string;
  lastUpdate: string;
}

// ========================================
// Signal Types
// ========================================

export type SignalType =
  | 'QUALITY_EDGE'
  | 'DOG_PHYSICAL'
  | 'COMBINED_DOG'
  | 'DOG_LEADING'
  | 'DOG_MEDIUM_FAV'
  | 'DOG_STRONG'
  | 'ANTI_FAV_HOT';

export type BetType = 'ML' | 'SPREAD';

// Kept for backward compat but no longer used by active signals
export type CoilTier = 'ELITE' | 'STANDARD' | 'LOCKED' | 'WEAK';

export type Urgency = 'DEVELOPING' | 'PRIME' | 'ACT_NOW' | 'CLOSING';

export type RecType = 'ML' | 'SPREAD' | 'WATCH';

export interface Signal {
  id: string;
  gameId: string;
  type: SignalType;
  game: string; // e.g., "BKN @ BOS"
  betTeam: string;
  fadeTeam: string;
  signalTypes: SignalType[];
  signalCount: number;

  // Signal-specific data
  coilTier?: CoilTier;
  starName?: string;
  starPts?: number;
  starExpected?: number;
  starPacing?: number;
  castGap?: number;
  qualityGap?: number;
  strongerWinPct?: number;
  trailingBy?: number;
  opponentFgPct?: number;

  // Market data
  bookSpread?: number;
  estLiveSpread?: number;
  marketOdds?: number;
  impliedP?: number;

  // Hybrid ML/Spread bet recommendation (dog signals)
  betType?: BetType;
  dogML?: number;
  dogSpread?: number;

  // Anti-signal (warning, not a bet)
  isWarning?: boolean;

  // Kelly sizing
  kellyPct: number;
  kellyBet: number;
  estWinProb: number;
  estEdge: number;

  // Urgency
  urgency: Urgency;
  urgencyMult: number;

  // Recommendation
  recType: RecType;
  recMargin?: number;

  // Timestamps
  firedAt: string;
  elapsedMins: number;
}

// ========================================
// Bet Tracker Types
// ========================================

export interface Bet {
  id: string;
  date: string;
  game: string;
  team: string;
  betType: 'ML' | 'SPREAD';
  spread?: number;
  odds: number;
  amount: number;
  signalType: SignalType;
  signalTier?: string;
  outcome: 'win' | 'loss' | 'push' | 'pending';
  payout?: number;
}

export interface BetSummary {
  totalBets: number;
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  totalWagered: number;
  totalPnl: number;
  winRate: number;
  roi: number;
  bySignalType: Record<string, { wins: number; losses: number; pnl: number }>;
}

// ========================================
// Settings Types
// ========================================

export interface UserSettings {
  email: string;
  phone: string;
  bankroll: number;
  alertPreferences: {
    emailAlerts: boolean;
    phoneAlerts: boolean;
    minSignalCount: number;
    minEdge: number;
  };
}

// ========================================
// Dashboard State
// ========================================

export interface DashboardState {
  games: NBAGame[];
  signals: Signal[];
  odds: Record<string, GameOdds>;
  lastUpdate: string;
  isLive: boolean;
}

// ========================================
// Star Cold Factor
// ========================================

export interface StarColdInfo {
  name: string;
  teamAbbr: string;
  currentPts: number;
  minutesPlayed: number;
  pacedPts: number;
  seasonPpg: number;
  coldPct: number;
}

// ========================================
// Star Player Database
// ========================================

export interface StarPlayer {
  name: string;
  teamAbbr: string;
  ppg: number;
}

export const NBA_STARS: StarPlayer[] = [
  { name: 'Luka Doncic', teamAbbr: 'LAL', ppg: 28.1 },
  { name: 'Shai Gilgeous-Alexander', teamAbbr: 'OKC', ppg: 31.4 },
  { name: 'Jayson Tatum', teamAbbr: 'BOS', ppg: 27.0 },
  { name: 'Jaylen Brown', teamAbbr: 'BOS', ppg: 24.0 },
  { name: 'Giannis Antetokounmpo', teamAbbr: 'MIL', ppg: 31.5 },
  { name: 'Kevin Durant', teamAbbr: 'PHX', ppg: 27.2 },
  { name: 'Devin Booker', teamAbbr: 'PHX', ppg: 25.5 },
  { name: 'Anthony Edwards', teamAbbr: 'MIN', ppg: 25.8 },
  { name: 'LeBron James', teamAbbr: 'LAL', ppg: 23.5 },
  { name: 'Stephen Curry', teamAbbr: 'GSW', ppg: 22.5 },
  { name: 'Nikola Jokic', teamAbbr: 'DEN', ppg: 26.4 },
  { name: 'Joel Embiid', teamAbbr: 'PHI', ppg: 27.0 },
  { name: 'Donovan Mitchell', teamAbbr: 'CLE', ppg: 24.0 },
  { name: 'Trae Young', teamAbbr: 'ATL', ppg: 25.4 },
  { name: 'De\'Aaron Fox', teamAbbr: 'SAC', ppg: 26.2 },
  { name: 'Anthony Davis', teamAbbr: 'LAL', ppg: 24.1 },
  { name: 'Tyrese Haliburton', teamAbbr: 'IND', ppg: 21.0 },
  { name: 'Damian Lillard', teamAbbr: 'MIL', ppg: 24.3 },
  { name: 'Jimmy Butler', teamAbbr: 'MIA', ppg: 21.0 },
  { name: 'Jalen Brunson', teamAbbr: 'NYK', ppg: 26.0 },
  { name: 'Paolo Banchero', teamAbbr: 'ORL', ppg: 23.0 },
  { name: 'Cade Cunningham', teamAbbr: 'DET', ppg: 24.0 },
  { name: 'Victor Wembanyama', teamAbbr: 'SAS', ppg: 24.5 },
];
