# Alert System Setup Guide

AlphaHunt sends you two types of alerts when betting signals fire:

- **Email** (via Resend) — every signal gets an email with full details
- **Phone call** (via Twilio) — Tier 2+ signals (highest confidence) trigger a voice call; Tier 1 signals get an SMS

---

## Step 1: Set Up Resend (Email)

1. Go to [resend.com](https://resend.com) and sign up (free tier = 100 emails/day)
2. In the dashboard, go to **API Keys** → **Create API Key**
3. Copy the key (starts with `re_`)
4. Add to your `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   USER_EMAIL=your@email.com
   ```

### Custom Domain (Optional)

By default, Resend sends from `onboarding@resend.dev`. To send from `alerts@alphahunt.one`:

1. In Resend dashboard → **Domains** → **Add Domain**
2. Add `alphahunt.one` and configure the DNS records they provide
3. Wait for verification (usually a few minutes)

Without a custom domain, emails may land in spam initially — mark them as "not spam" once and you're good.

---

## Step 2: Set Up Twilio (Phone Calls + SMS)

1. Go to [twilio.com](https://www.twilio.com/try-twilio) and sign up
2. Free trial gives you **$15.50 credit** — enough for ~200 calls or ~1,000 SMS
3. In the Twilio Console:
   - Copy your **Account SID** (starts with `AC`)
   - Copy your **Auth Token**
4. Go to **Phone Numbers** → **Buy a Number** (first number is free on trial)
   - Choose a US number with Voice + SMS capabilities
5. Add to your `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   USER_PHONE_NUMBER=+1987654321
   ```

### Trial Account Note

On Twilio trial, you can only call/SMS **verified numbers**. Go to:
- Console → Phone Numbers → Verified Caller IDs → Add your personal number

After upgrading (pay-as-you-go), this restriction is removed.

---

## Step 3: Configure `.env.local`

Your complete `.env.local` should have:

```bash
# The Odds API
ODDS_API_KEY=62f4929bae56381c5961625f82335e39

# Resend (email)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Twilio (phone)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Your contact info
USER_EMAIL=your@email.com
USER_PHONE_NUMBER=+1987654321

# Bankroll
DEFAULT_BANKROLL=20000
```

---

## Step 4: Test the Alerts

Start the app:

```bash
npm run dev
```

### Test Bet Alert (email + phone)

```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bet",
    "team": "LAL",
    "game": "LAL @ BOS",
    "signalType": "DOG_PHYSICAL",
    "score": "LAL 65, BOS 52",
    "spread": "-4.5",
    "betSize": 350,
    "kellyPct": 1.8,
    "estEdge": 4.5,
    "estWinProb": 58.2,
    "urgency": "PRIME",
    "recType": "ML",
    "betType": "ML",
    "elapsedMins": 28,
    "signalCount": 2
  }'
```

This sends:
- An HTML email with signal details and bet size
- A phone **call** (because `signalCount: 2` = Tier 2+)

### Test Tier 1 Alert (email + SMS)

```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bet",
    "team": "MIL",
    "game": "MIL @ PHX",
    "signalType": "QUALITY_EDGE",
    "score": "MIL 22, PHX 28",
    "betSize": 150,
    "urgency": "DEVELOPING",
    "signalCount": 1
  }'
```

This sends:
- An HTML email
- An **SMS** (because `signalCount: 1` = Tier 1)

### Test Daily Digest

```bash
curl http://localhost:3000/api/cron/daily-digest
```

This fetches tonight's games from The Odds API and sends a digest email.

---

## Step 5: Set Up Daily Digest Cron (Production)

For Vercel deployment, add a cron job in `vercel.json`:

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

This runs at 5:00 PM ET (22:00 UTC) every day.

Alternatively, use any cron service to hit:
```
GET https://alphahunt.one/api/cron/daily-digest
```

---

## Alert Routing Logic

| Signal Count | Signal Tier | Email | Phone |
|---|---|---|---|
| 1 | Simple/Tier 1 | Yes | SMS |
| 2 | Tier 2 (Dog Physical, Dog Medium Fav, etc.) | Yes | Voice Call |
| 3+ | Tier 3 (Dog Strong) | Yes | Voice Call |

The voice call repeats the message twice so you don't miss it:

> "Bet alert. LAL DOG PHYSICAL, ML. Score: LAL 65, BOS 52. Bet 350 dollars. Check Alpha Hunt for details."

---

## Cost Estimates

| Service | Free Tier | Paid |
|---|---|---|
| Resend | 100 emails/day, 3,000/month | $20/mo for 50K emails |
| Twilio SMS | ~1,000 with trial credit | ~$0.0079/SMS |
| Twilio Voice | ~200 calls with trial credit | ~$0.014/min |

For typical usage (2-5 signals/night, 1 digest/day), the free tiers are more than enough.
