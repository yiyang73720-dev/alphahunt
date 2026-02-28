import { NextResponse } from 'next/server';
import { sendDailyDigest } from '@/lib/alerts/email';

export const dynamic = 'force-dynamic';

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/sports/basketball_nba';

interface OddsEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: Array<{
    key: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

export async function GET() {
  try {
    // Fetch today's NBA odds
    const oddsUrl = `${ODDS_API_BASE}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,h2h&oddsFormat=american`;
    const res = await fetch(oddsUrl, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Odds API error: ${res.status}` },
        { status: 502 },
      );
    }

    const events: OddsEvent[] = await res.json();

    // Filter to today's games
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

    const todayGames = events.filter((e) => {
      const gameDate = e.commence_time.split('T')[0];
      return gameDate === todayStr || gameDate === tomorrowStr;
    });

    // Build digest data
    const games = todayGames.map((e) => {
      const book = e.bookmakers.find((b) => b.key === 'fanduel') || e.bookmakers[0];
      const spreads = book?.markets.find((m) => m.key === 'spreads');
      const h2h = book?.markets.find((m) => m.key === 'h2h');

      const homeSpread = spreads?.outcomes.find((o) => o.name === e.home_team)?.point;
      const homeML = h2h?.outcomes.find((o) => o.name === e.home_team)?.price;
      const awayML = h2h?.outcomes.find((o) => o.name === e.away_team)?.price;

      // Flag dogs worth watching (underdogs with small spreads)
      let watchReason: string | undefined;
      if (homeSpread != null) {
        const abSpread = Math.abs(homeSpread);
        if (abSpread >= 5 && abSpread <= 9) {
          const dogTeam = homeSpread > 0 ? e.home_team : e.away_team;
          watchReason = `${dogTeam} +${abSpread} — potential Dog Physicality zone`;
        }
      }

      const gameTime = new Date(e.commence_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
      });

      return {
        game: `${e.away_team} @ ${e.home_team}`,
        startTime: `${gameTime} ET`,
        homeSpread,
        homeML,
        awayML,
        watchReason,
      };
    });

    const dogsToWatch = games
      .filter((g) => g.watchReason)
      .map((g) => g.watchReason!);

    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York',
    });

    const result = await sendDailyDigest({
      date: dateStr,
      games,
      dogsToWatch,
      notes: games.length === 0
        ? 'No NBA games scheduled tonight.'
        : `${dogsToWatch.length} dog${dogsToWatch.length === 1 ? '' : 's'} worth watching for live betting signals.`,
    });

    return NextResponse.json({
      success: result.success,
      gamesCount: games.length,
      dogsToWatch: dogsToWatch.length,
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Daily digest error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
