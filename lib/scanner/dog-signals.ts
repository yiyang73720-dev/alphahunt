import { NBAGame, Signal, GameOdds, BetType } from '../types';
import { getElapsedMins, getUrgency, getRecType, kellySize, impliedProb } from '../signals';

// ========================================
// Dog Signals — Validated from 43,679-row backtest
// ========================================
//
// DOG_LEADING:   Dog ahead + Q2+ (66.6% dog cover, z=32.88, ROI 27.2%)
// DOG_MEDIUM_FAV: Dog leading + Q2+ + medium fav 3.5-7 spread (70.0% cover, z=24.23, ROI 33.6%)
// DOG_PHYSICAL:  Dog leading + Q2+ + wins REB (67.2% cover, z=26.85, ROI 28.3%)
// DOG_STRONG:    Dog leading 5+ + Q2+ + wins REB + wins FTA (72.5% cover, z=20.17, ROI 38.4%)

function getFavDog(game: NBAGame, odds: GameOdds) {
  const homeFav = odds.homeSpread < 0;
  const fav = homeFav ? game.homeTeam : game.awayTeam;
  const dog = homeFav ? game.awayTeam : game.homeTeam;
  const absSpread = Math.abs(odds.homeSpread);
  const dogML = homeFav ? odds.awayML : odds.homeML;
  const dogSpread = homeFav ? odds.awaySpread : odds.homeSpread;
  return { fav, dog, homeFav, absSpread, dogML, dogSpread };
}

// Hybrid rule: dog ML >= -100 → bet ML, dog ML < -100 → bet spread
function getDogBetType(dogML: number): BetType {
  return dogML >= -100 ? 'ML' : 'SPREAD';
}

// DOG_LEADING: Dog ahead + Q2+ (elapsed >= 12)
// Backtest: n=9801, 66.6% dog cover, ROI 27.2%, z=32.88
export function detectDogLeading(
  game: NBAGame,
  elapsedMins: number,
  odds: GameOdds | undefined,
): Signal | null {
  if (!odds) return null;
  if (elapsedMins < 12) return null; // Q2+

  const { fav, dog, homeFav, absSpread, dogML, dogSpread } = getFavDog(game, odds);
  const dogLead = dog.score - fav.score;
  if (dogLead < 1) return null; // Dog must be leading

  const { urgency, mult } = getUrgency(elapsedMins);
  const margin = dogLead;
  const betType = getDogBetType(dogML);
  const marketOdds = betType === 'ML' ? dogML : (homeFav ? (odds.awayML || 150) : (odds.homeML || 150));
  const ip = impliedProb(marketOdds);
  const { kellyPct, kellyBet, estWinProb, estEdge } = kellySize(1, ip, marketOdds, mult);

  return {
    id: `${game.gameId}_dog_leading`,
    gameId: game.gameId,
    type: 'DOG_LEADING',
    game: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
    betTeam: dog.abbr,
    fadeTeam: fav.abbr,
    signalTypes: ['DOG_LEADING'],
    signalCount: 1,
    bookSpread: odds.homeSpread,
    marketOdds,
    impliedP: Math.round(ip * 10) / 10,
    betType,
    dogML,
    dogSpread,
    kellyPct,
    kellyBet,
    estWinProb,
    estEdge,
    urgency,
    urgencyMult: mult,
    recType: betType,
    recMargin: margin,
    firedAt: new Date().toISOString(),
    elapsedMins: Math.round(elapsedMins * 10) / 10,
  };
}

// DOG_MEDIUM_FAV: Dog leading + Q2+ + medium fav (spread 3.5-7)
// Backtest: n=3685, 70.0% dog cover, ROI 33.6%, z=24.23
export function detectDogMediumFav(
  game: NBAGame,
  elapsedMins: number,
  odds: GameOdds | undefined,
): Signal | null {
  if (!odds) return null;
  if (elapsedMins < 12) return null;

  const { fav, dog, homeFav, absSpread, dogML, dogSpread } = getFavDog(game, odds);

  // Medium favorite: spread 3.5-7
  if (absSpread < 3.5 || absSpread > 7) return null;

  const dogLead = dog.score - fav.score;
  if (dogLead < 1) return null;

  const { urgency, mult } = getUrgency(elapsedMins);
  const margin = dogLead;
  const betType = getDogBetType(dogML);
  const marketOdds = betType === 'ML' ? dogML : (homeFav ? (odds.awayML || 160) : (odds.homeML || 160));
  const ip = impliedProb(marketOdds);
  const { kellyPct, kellyBet, estWinProb, estEdge } = kellySize(2, ip, marketOdds, mult);

  return {
    id: `${game.gameId}_dog_medium_fav`,
    gameId: game.gameId,
    type: 'DOG_MEDIUM_FAV',
    game: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
    betTeam: dog.abbr,
    fadeTeam: fav.abbr,
    signalTypes: ['DOG_LEADING', 'DOG_MEDIUM_FAV'],
    signalCount: 2,
    bookSpread: odds.homeSpread,
    marketOdds,
    impliedP: Math.round(ip * 10) / 10,
    betType,
    dogML,
    dogSpread,
    kellyPct,
    kellyBet,
    estWinProb,
    estEdge,
    urgency,
    urgencyMult: mult,
    recType: betType,
    recMargin: margin,
    firedAt: new Date().toISOString(),
    elapsedMins: Math.round(elapsedMins * 10) / 10,
  };
}

// DOG_PHYSICAL (upgraded): Dog leading + Q2+ + wins REB
// Backtest: n=6075, 67.2% dog cover, ROI 28.3%, z=26.85
// NOTE: This replaces the old DOG_PHYSICAL in signals.ts which required
// dog to be within 8 pts but not necessarily leading. The new version
// from research requires dog to actually be leading + win rebounds.
export function detectDogPhysicalV2(
  game: NBAGame,
  elapsedMins: number,
  odds: GameOdds | undefined,
): Signal | null {
  if (!odds) return null;
  if (elapsedMins < 12) return null;

  const { fav, dog, homeFav, dogML, dogSpread } = getFavDog(game, odds);

  const dogLead = dog.score - fav.score;
  if (dogLead < 1) return null; // Dog must be leading

  // Dog must win rebounds
  if (!dog.stats || !fav.stats) return null;
  const rebDiff = dog.stats.rebTotal - fav.stats.rebTotal;
  if (rebDiff < 1) return null;

  const { urgency, mult } = getUrgency(elapsedMins);
  const margin = dogLead;
  const betType = getDogBetType(dogML);
  const marketOdds = betType === 'ML' ? dogML : (homeFav ? (odds.awayML || 150) : (odds.homeML || 150));
  const ip = impliedProb(marketOdds);
  const { kellyPct, kellyBet, estWinProb, estEdge } = kellySize(2, ip, marketOdds, mult);

  return {
    id: `${game.gameId}_dog_physical`,
    gameId: game.gameId,
    type: 'DOG_PHYSICAL',
    game: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
    betTeam: dog.abbr,
    fadeTeam: fav.abbr,
    signalTypes: ['DOG_LEADING', 'DOG_PHYSICAL'],
    signalCount: 2,
    bookSpread: odds.homeSpread,
    marketOdds,
    impliedP: Math.round(ip * 10) / 10,
    betType,
    dogML,
    dogSpread,
    kellyPct,
    kellyBet,
    estWinProb,
    estEdge,
    urgency,
    urgencyMult: mult,
    recType: betType,
    recMargin: margin,
    firedAt: new Date().toISOString(),
    elapsedMins: Math.round(elapsedMins * 10) / 10,
  };
}

// DOG_STRONG: Dog leading 5+ + Q2+ + wins REB + wins FTA
// Backtest: n=2005, 72.5% dog cover, ROI 38.4%, z=20.17
export function detectDogStrong(
  game: NBAGame,
  elapsedMins: number,
  odds: GameOdds | undefined,
): Signal | null {
  if (!odds) return null;
  if (elapsedMins < 12) return null;

  const { fav, dog, homeFav, dogML, dogSpread } = getFavDog(game, odds);

  const dogLead = dog.score - fav.score;
  if (dogLead < 5) return null; // Dog must lead by 5+

  if (!dog.stats || !fav.stats) return null;

  // Dog must win both REB and FTA
  const rebDiff = dog.stats.rebTotal - fav.stats.rebTotal;
  const ftaDiff = dog.stats.fta - fav.stats.fta;
  if (rebDiff < 1) return null;
  if (ftaDiff < 1) return null;

  const { urgency, mult } = getUrgency(elapsedMins);
  const margin = dogLead;
  const betType = getDogBetType(dogML);
  const marketOdds = betType === 'ML' ? dogML : (homeFav ? (odds.awayML || 170) : (odds.homeML || 170));
  const ip = impliedProb(marketOdds);
  const { kellyPct, kellyBet, estWinProb, estEdge } = kellySize(3, ip, marketOdds, mult);

  return {
    id: `${game.gameId}_dog_strong`,
    gameId: game.gameId,
    type: 'DOG_STRONG',
    game: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
    betTeam: dog.abbr,
    fadeTeam: fav.abbr,
    signalTypes: ['DOG_LEADING', 'DOG_PHYSICAL', 'DOG_STRONG'],
    signalCount: 3,
    bookSpread: odds.homeSpread,
    marketOdds,
    impliedP: Math.round(ip * 10) / 10,
    betType,
    dogML,
    dogSpread,
    kellyPct,
    kellyBet,
    estWinProb,
    estEdge,
    urgency,
    urgencyMult: mult,
    recType: betType,
    recMargin: margin,
    firedAt: new Date().toISOString(),
    elapsedMins: Math.round(elapsedMins * 10) / 10,
  };
}

// Calculate all dog signals for a game, return the best (highest tier)
export function calculateDogSignals(
  game: NBAGame,
  elapsedMins: number,
  odds: GameOdds | undefined,
): Signal | null {
  // Try from strongest to weakest — return the best match
  const strong = detectDogStrong(game, elapsedMins, odds);
  if (strong) return strong;

  const medFav = detectDogMediumFav(game, elapsedMins, odds);
  const physical = detectDogPhysicalV2(game, elapsedMins, odds);

  // If both medium fav and physical fire, return physical (higher sample)
  if (physical) return physical;
  if (medFav) return medFav;

  const leading = detectDogLeading(game, elapsedMins, odds);
  return leading;
}
