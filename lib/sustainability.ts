import { BoxScoreStats, StarColdInfo } from './types';

// ========================================
// League Average Constants
// ========================================

const LEAGUE_AVG_3PT_PCT = 0.36;
const LEAGUE_AVG_2PT_PCT = 0.52;
const LEAGUE_AVG_FT_PCT = 0.77;

// Normalization ranges from backtest data
const LUCK_3PT_RANGE = 12; // typical ±12 points
const LUCK_2PT_RANGE = 10;
const LUCK_FT_RANGE = 6;

// ========================================
// Interfaces
// ========================================

export interface TeamSustainability {
  // Luck scores (normalized)
  luck3pt: number;        // -10 to +10
  luck2pt: number;        // -10 to +10
  luckFt: number;         // -5 to +5
  totalLuckPts: number;   // raw points from shooting variance

  // Expected vs actual
  expectedScore: number;
  luckFraction: number;   // totalLuckPts / pts

  // Scoring source breakdown (percentages 0-1)
  paintDependency: number;
  threePtDependency: number;
  ftDependency: number;

  // Process quality (0-10)
  processScore: number;
  astRate: number;
  tovRate: number;
  orebRate: number;
  hustleRate: number;     // (steals + blocks) per minute

  // Verdict
  verdict: 'SUSTAINABLE' | 'MIXED' | 'UNSUSTAINABLE';
}

export interface SustainabilityMetrics {
  home: TeamSustainability;
  away: TeamSustainability;

  // 3PT shooting stats
  fg3Stats?: {
    home: { fg3Pct: number; fg3a: number; fg3m: number };
    away: { fg3Pct: number; fg3a: number; fg3m: number };
  };

  // Star cold factor
  starCold?: StarColdInfo[];
}

// ========================================
// Helpers
// ========================================

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ========================================
// Per-Team Sustainability Computation
// ========================================

function computeTeam(stats: BoxScoreStats, score: number, elapsedMins: number): TeamSustainability {
  const pts = score > 0 ? score : (stats.pts || 0);
  const fga = stats.fga || 0;
  const fgm = stats.fgm || 0;
  const fg3a = stats.fg3a || 0;
  const fg3m = stats.fg3m || 0;
  const fta = stats.fta || 0;
  const ftm = stats.ftm || 0;
  const fg2a = fga - fg3a;

  // Actual shooting percentages (safe division)
  const actual3ptPct = fg3a > 0 ? fg3m / fg3a : LEAGUE_AVG_3PT_PCT;
  const actual2ptPct = fg2a > 0 ? (fgm - fg3m) / fg2a : LEAGUE_AVG_2PT_PCT;
  const actualFtPct = fta > 0 ? ftm / fta : LEAGUE_AVG_FT_PCT;

  // Raw luck points
  const raw3ptLuck = (actual3ptPct - LEAGUE_AVG_3PT_PCT) * fg3a * 3;
  const raw2ptLuck = (actual2ptPct - LEAGUE_AVG_2PT_PCT) * fg2a * 2;
  const rawFtLuck = (actualFtPct - LEAGUE_AVG_FT_PCT) * fta;
  const totalLuckPts = raw3ptLuck + raw2ptLuck + rawFtLuck;

  // Normalized luck scores
  const luck3pt = clamp((raw3ptLuck / LUCK_3PT_RANGE) * 10, -10, 10);
  const luck2pt = clamp((raw2ptLuck / LUCK_2PT_RANGE) * 10, -10, 10);
  const luckFt = clamp((rawFtLuck / LUCK_FT_RANGE) * 5, -5, 5);

  // Expected score at league-average shooting
  const expectedScore = fg3a * LEAGUE_AVG_3PT_PCT * 3 + fg2a * LEAGUE_AVG_2PT_PCT * 2 + fta * LEAGUE_AVG_FT_PCT;

  // Luck fraction
  const luckFraction = pts > 0 ? totalLuckPts / pts : 0;

  // Scoring source breakdown
  const paintPts = (fgm - fg3m) * 2;
  const threePts = fg3m * 3;
  const paintDependency = pts > 0 ? paintPts / pts : 0;
  const threePtDependency = pts > 0 ? threePts / pts : 0;
  const ftDependency = pts > 0 ? ftm / pts : 0;

  // Process quality components
  const astRate = fgm > 0 ? stats.assists / fgm : 0;
  const possessions = fga + 0.44 * fta + stats.turnovers;
  const tovRate = possessions > 0 ? stats.turnovers / possessions : 0;
  const mins = Math.max(elapsedMins, 1);
  const orebRate = stats.rebOff / mins; // OREB per minute
  const hustleRate = (stats.steals + stats.blocks) / mins;

  // Combine into 0-10 process score
  // AST rate: league avg ~0.60, scale 0-1 → 0-3 points
  const astScore = clamp(astRate / 0.70, 0, 1) * 3;
  // TOV rate: league avg ~0.13, lower is better. 0.08 = perfect, 0.20 = terrible
  const tovScore = clamp(1 - (tovRate - 0.08) / 0.12, 0, 1) * 3;
  // OREB: ~0.20/min is average, scale to 0-2
  const orebScore = clamp(orebRate / 0.30, 0, 1) * 2;
  // Hustle: ~0.15/min average (steals+blocks), scale to 0-2
  const hustleScore = clamp(hustleRate / 0.20, 0, 1) * 2;

  const processScore = clamp(astScore + tovScore + orebScore + hustleScore, 0, 10);

  // Verdict — only HOT shooting (positive luck) is unsustainable
  // Cold shooting (negative luck) means team is likely to IMPROVE, not degrade
  let verdict: TeamSustainability['verdict'];
  if (totalLuckPts > 6 || (threePtDependency > 0.45 && actual3ptPct > 0.42)) {
    verdict = 'UNSUSTAINABLE';
  } else if (totalLuckPts < 3 && processScore > 5 && paintDependency > 0.35) {
    verdict = 'SUSTAINABLE';
  } else {
    verdict = 'MIXED';
  }

  return {
    luck3pt: round1(luck3pt),
    luck2pt: round1(luck2pt),
    luckFt: round1(luckFt),
    totalLuckPts: round1(totalLuckPts),
    expectedScore: round1(expectedScore),
    luckFraction: round3(luckFraction),
    paintDependency: round3(paintDependency),
    threePtDependency: round3(threePtDependency),
    ftDependency: round3(ftDependency),
    processScore: round1(processScore),
    astRate: round3(astRate),
    tovRate: round3(tovRate),
    orebRate: round3(orebRate),
    hustleRate: round3(hustleRate),
    verdict,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ========================================
// Main Export
// ========================================

export function computeSustainability(
  home: BoxScoreStats,
  away: BoxScoreStats,
  homeScore: number,
  awayScore: number,
  elapsedMins: number,
): SustainabilityMetrics {
  const homeMetrics = computeTeam(home, homeScore, elapsedMins);
  const awayMetrics = computeTeam(away, awayScore, elapsedMins);

  return {
    home: homeMetrics,
    away: awayMetrics,
    fg3Stats: {
      home: { fg3Pct: home.fg3a > 0 ? round3(home.fg3m / home.fg3a) : 0, fg3a: home.fg3a, fg3m: home.fg3m },
      away: { fg3Pct: away.fg3a > 0 ? round3(away.fg3m / away.fg3a) : 0, fg3a: away.fg3a, fg3m: away.fg3m },
    },
  };
}
