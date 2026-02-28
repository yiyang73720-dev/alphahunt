# AlphaHunt Deployment Guide

## 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# From the alphahunt-app directory
cd alphahunt-app
vercel
```

Follow the prompts:
- Link to your Vercel account
- Select "Create a new project"
- Framework preset will auto-detect **Next.js**
- Accept defaults for build settings

For subsequent deploys:
```bash
vercel --prod
```

## 2. Set Environment Variables

Go to your Vercel Dashboard → Project → **Settings** → **Environment Variables**.

Add these variables (all environments: Production, Preview, Development):

| Variable | Value | Required |
|---|---|---|
| `ODDS_API_KEY` | Your key from [the-odds-api.com](https://the-odds-api.com) | Yes |
| `RESEND_API_KEY` | Your key from [resend.com](https://resend.com) (starts with `re_`) | For email alerts |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID (starts with `AC`) | For phone alerts |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | For phone alerts |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (`+1234567890`) | For phone alerts |
| `USER_EMAIL` | Your email to receive alerts | For email alerts |
| `USER_PHONE_NUMBER` | Your phone number (`+1234567890`) | For phone alerts |
| `DEFAULT_BANKROLL` | Bankroll amount in dollars (default: `20000`) | No |
| `NEXT_PUBLIC_BASE_URL` | Your Vercel URL: `https://alphahunt.one` | Yes |

After adding variables, **redeploy** for them to take effect:
```bash
vercel --prod
```

## 3. Point alphahunt.one Domain to Vercel

In Vercel Dashboard → Project → **Settings** → **Domains**:

1. Click **Add Domain** and enter `alphahunt.one`
2. Vercel will show DNS records to configure

In your domain registrar's DNS settings:

| Type | Name | Value |
|---|---|---|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

Wait for DNS propagation (usually 5-30 minutes).

Vercel automatically provisions an SSL certificate.

## 4. Daily Digest Cron Job

The `vercel.json` file is already configured to run the daily digest:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 22 * * *"
    }
  ]
}
```

This runs at **5:00 PM ET** (22:00 UTC) every day, sending you an email with tonight's games, spreads, and dogs to watch.

**Note:** Vercel Cron requires the **Pro plan** ($20/mo) or higher. On the free/Hobby plan, use an external cron service (e.g., cron-job.org) to hit `GET https://alphahunt.one/api/cron/daily-digest` daily at 5 PM ET.

## 5. How the Scanner Works

The scanner auto-starts via `instrumentation.ts`:

- On server boot, it checks if it's during **game hours** (7 PM - 1 AM ET)
- If yes, the scanner starts automatically, polling every **30 seconds**
- It fetches live scores from the NBA CDN, odds from The Odds API, and box scores for live games
- When a signal fires (Star Coil, Quality Edge, Dog Leading, etc.), it calls `/api/alerts` to send email + phone alerts
- Outside game hours, the scanner stays idle

You can also control it manually:
```bash
# Start scanner
curl -X POST https://alphahunt.one/api/scanner/start

# Stop scanner
curl -X POST https://alphahunt.one/api/scanner/stop

# Check status
curl https://alphahunt.one/api/scanner/status

# Run one scan cycle
curl -X POST https://alphahunt.one/api/scanner/scan
```

### Vercel Serverless Limitation

Vercel serverless functions have a **60-second timeout** (Pro plan: 300s). The scanner runs as a long-lived process via `instrumentation.ts`, which works in Next.js standalone mode. On Vercel, the scanner will restart on each cold start during game hours.

For a persistent scanner, consider running a separate worker on **Railway** ($5/mo) or **Fly.io**:
```bash
# On Railway, deploy the same app and set NEXT_PUBLIC_BASE_URL to your Vercel URL
# The instrumentation.ts will auto-start the scanner
```

## 6. Verify Deployment

After deploying, check:

1. **Dashboard loads**: Visit `https://alphahunt.one` — should show today's games
2. **Tonight page**: Visit `/tonight` — shows pre-game odds and dogs to watch
3. **Scanner status**: `GET /api/scanner/status` — should show `isRunning: true` during game hours
4. **Test alert**: Send a test POST to `/api/alerts` (see ALERT-SETUP.md for curl examples)
5. **Daily digest**: `GET /api/cron/daily-digest` — should send a test digest email

## 7. Resend Domain Setup (Optional)

To send emails from `alerts@alphahunt.one` instead of the default Resend domain:

1. Go to [resend.com](https://resend.com) → Domains → Add Domain
2. Enter `alphahunt.one`
3. Add the DNS records Resend provides (SPF, DKIM, DMARC)
4. Wait for verification

See `ALERT-SETUP.md` for full alert configuration details.
