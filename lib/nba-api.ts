import { NBAGame, TeamInfo, BoxScoreStats, GameOdds } from './types';

// ========================================
// NBA CDN — Today's Scoreboard
// ========================================

interface NbaCdnGame {
  gameId: string;
  gameStatus: number; // 1=pre, 2=live, 3=final
  gameStatusText: string;
  period: number;
  gameClock: string;
  gameTimeUTC: string;
  arenaName?: string;
  homeTeam: {
    teamId: number;
    teamTricode: string;
    teamName: string;
    teamCity: string;
    score: number;
    statistics?: NbaCdnStats[];
  };
  awayTeam: {
    teamId: number;
    teamTricode: string;
    teamName: string;
    teamCity: string;
    score: number;
    statistics?: NbaCdnStats[];
  };
}

interface NbaCdnStats {
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fieldGoalsPercentage: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePointersPercentage: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  freeThrowsPercentage: number;
  reboundsOffensive: number;
  reboundsDefensive: number;
  reboundsTotal: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  foulsPersonal: number;
  points: number;
}

function parseStats(stats?: NbaCdnStats[]): BoxScoreStats | undefined {
  if (!stats || stats.length === 0) return undefined;
  const s = stats[0];
  return {
    fgm: s.fieldGoalsMade,
    fga: s.fieldGoalsAttempted,
    fgPct: s.fieldGoalsPercentage,
    fg3m: s.threePointersMade,
    fg3a: s.threePointersAttempted,
    fg3Pct: s.threePointersPercentage,
    ftm: s.freeThrowsMade,
    fta: s.freeThrowsAttempted,
    ftPct: s.freeThrowsPercentage,
    rebOff: s.reboundsOffensive,
    rebDef: s.reboundsDefensive,
    rebTotal: s.reboundsTotal,
    assists: s.assists,
    steals: s.steals,
    blocks: s.blocks,
    turnovers: s.turnovers,
    pf: s.foulsPersonal,
    pts: s.points,
  };
}

function parseTeam(t: NbaCdnGame['homeTeam']): TeamInfo {
  return {
    teamId: String(t.teamId),
    abbr: t.teamTricode,
    name: t.teamName,
    city: t.teamCity,
    score: t.score,
    stats: parseStats(t.statistics),
  };
}

export async function fetchScoreboard(): Promise<NBAGame[]> {
  const url = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
  const res = await fetch(url, { next: { revalidate: 15 } });
  if (!res.ok) throw new Error(`NBA CDN error: ${res.status}`);

  const data = await res.json();
  const games: NbaCdnGame[] = data?.scoreboard?.games || [];

  return games.map((g) => ({
    gameId: g.gameId,
    status: g.gameStatus === 1 ? 'pre' : g.gameStatus === 2 ? 'live' : 'final',
    period: g.period,
    clock: g.gameClock || '',
    homeTeam: parseTeam(g.homeTeam),
    awayTeam: parseTeam(g.awayTeam),
    startTime: g.gameTimeUTC,
    arena: g.arenaName,
  }));
}

// ========================================
// NBA CDN — Box Score
// ========================================

interface NbaCdnBoxPlayer {
  firstName: string;
  familyName: string;
  statistics: {
    points: number;
    minutes: string;
    reboundsTotal: number;
    assists: number;
  };
}

// Parse NBA CDN minutes string — handles ISO 8601 "PT07M59.00S" and "MM:SS" formats
export function parseMinutes(raw: string): number {
  if (!raw) return 0;
  const iso = raw.match(/PT(\d+)M([\d.]+)S/);
  if (iso) return parseInt(iso[1]) + parseFloat(iso[2]) / 60;
  const parts = raw.split(':');
  if (parts.length === 2) return parseInt(parts[0]) + parseInt(parts[1]) / 60;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
}

export async function fetchBoxScore(gameId: string) {
  const url = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;
  const res = await fetch(url, { next: { revalidate: 15 } });
  if (!res.ok) return null;

  const data = await res.json();
  const game = data?.game;
  if (!game) return null;

  const parsePlayers = (players: NbaCdnBoxPlayer[]) =>
    (players || []).map((p) => ({
      name: `${p.firstName} ${p.familyName}`,
      points: p.statistics?.points || 0,
      minutes: p.statistics?.minutes || '0:00',
      rebounds: p.statistics?.reboundsTotal || 0,
      assists: p.statistics?.assists || 0,
    }));

  return {
    gameId,
    homePlayers: parsePlayers(game.homeTeam?.players),
    awayPlayers: parsePlayers(game.awayTeam?.players),
    homeTeam: {
      abbr: game.homeTeam?.teamTricode,
      stats: game.homeTeam?.statistics,
    },
    awayTeam: {
      abbr: game.awayTeam?.teamTricode,
      stats: game.awayTeam?.statistics,
    },
  };
}

// ========================================
// The Odds API — Pre-game & Live Odds
// ========================================

export async function fetchOdds(): Promise<GameOdds[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return [];

  const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=spreads,h2h&oddsFormat=american&bookmakers=draftkings,fanduel`;

  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) return [];

  const events = await res.json();
  const results: GameOdds[] = [];

  for (const event of events) {
    const bookmaker = event.bookmakers?.[0];
    if (!bookmaker) continue;

    let homeSpread = 0, awaySpread = 0, homeML = 0, awayML = 0;

    for (const market of bookmaker.markets || []) {
      if (market.key === 'spreads') {
        for (const outcome of market.outcomes || []) {
          if (outcome.name === event.home_team) homeSpread = outcome.point;
          else awaySpread = outcome.point;
        }
      }
      if (market.key === 'h2h') {
        for (const outcome of market.outcomes || []) {
          if (outcome.name === event.home_team) homeML = outcome.price;
          else awayML = outcome.price;
        }
      }
    }

    results.push({
      gameId: event.id,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      homeSpread,
      awaySpread,
      homeML,
      awayML,
      bookmaker: bookmaker.title,
      lastUpdate: bookmaker.last_update,
    });
  }

  return results;
}

// ========================================
// Team abbreviation mapping for odds matching
// ========================================

const TEAM_ABBR_MAP: Record<string, string> = {
  'Atlanta Hawks': 'ATL',
  'Boston Celtics': 'BOS',
  'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA',
  'Chicago Bulls': 'CHI',
  'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL',
  'Denver Nuggets': 'DEN',
  'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW',
  'Houston Rockets': 'HOU',
  'Indiana Pacers': 'IND',
  'Los Angeles Clippers': 'LAC',
  'Los Angeles Lakers': 'LAL',
  'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA',
  'Milwaukee Bucks': 'MIL',
  'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP',
  'New York Knicks': 'NYK',
  'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL',
  'Philadelphia 76ers': 'PHI',
  'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR',
  'Sacramento Kings': 'SAC',
  'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR',
  'Utah Jazz': 'UTA',
  'Washington Wizards': 'WAS',
};

export function teamAbbrFromName(fullName: string): string {
  return TEAM_ABBR_MAP[fullName] || fullName.slice(0, 3).toUpperCase();
}

// ========================================
// Approximate win percentages (updated periodically)
// ========================================

export const TEAM_WIN_PCT: Record<string, number> = {
  OKC: 72.0, CLE: 68.3, BOS: 65.5, HOU: 60.0, NYK: 58.5,
  MEM: 57.0, DEN: 56.1, MIN: 55.0, LAC: 54.0, MIL: 53.5,
  DAL: 52.5, GSW: 51.0, SAC: 50.5, IND: 50.0, LAL: 49.5,
  PHX: 49.0, SAS: 48.0, MIA: 47.5, ATL: 46.0, DET: 45.0,
  CHI: 43.0, ORL: 42.0, POR: 40.0, TOR: 38.0, BKN: 35.0,
  NOP: 32.0, CHA: 30.0, PHI: 28.0, UTA: 26.0, WAS: 22.0,
};
