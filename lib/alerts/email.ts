import { Resend } from 'resend';

const FROM_EMAIL = 'AlphaHunt <alerts@alphahunt.one>';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

interface BetAlertData {
  team: string;
  opponent?: string;
  game: string;
  signalType: string;
  tier?: string;
  score: string;
  spread?: string;
  betSize: number;
  kellyPct?: number;
  estEdge?: number;
  estWinProb?: number;
  urgency?: string;
  recType?: string;
  elapsedMins?: number;
  starName?: string;
  firedAt?: string;
  betType?: 'ML' | 'SPREAD';
  dogML?: number;
  dogSpread?: number;
}

interface DigestGame {
  game: string;
  startTime: string;
  homeSpread?: number;
  homeML?: number;
  awayML?: number;
  watchReason?: string;
}

interface DigestData {
  date: string;
  games: DigestGame[];
  dogsToWatch: string[];
  notes?: string;
}

export async function sendBetAlert(data: BetAlertData): Promise<{ success: boolean; error?: string }> {
  const userEmail = process.env.USER_EMAIL || process.env.ALERT_EMAIL;
  if (!userEmail) return { success: false, error: 'No USER_EMAIL configured' };

  const resend = getResend();
  if (!resend) return { success: false, error: 'No RESEND_API_KEY configured' };

  const html = buildBetAlertHtml(data);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `BET ALERT: ${data.team} ${data.signalType}${data.tier ? ` (${data.tier})` : ''} — $${data.betSize}`,
      html,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function sendDailyDigest(data: DigestData): Promise<{ success: boolean; error?: string }> {
  const userEmail = process.env.USER_EMAIL || process.env.ALERT_EMAIL;
  if (!userEmail) return { success: false, error: 'No USER_EMAIL configured' };

  const resend = getResend();
  if (!resend) return { success: false, error: 'No RESEND_API_KEY configured' };

  const html = buildDailyDigestHtml(data);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `AlphaHunt Tonight — ${data.games.length} Games (${data.date})`,
      html,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ========================================
// HTML Email Builders
// ========================================

function buildBetAlertHtml(data: BetAlertData): string {
  const urgencyColor = {
    DEVELOPING: '#3861fb',
    PRIME: '#16c784',
    ACT_NOW: '#f0b90b',
    CLOSING: '#ea3943',
  }[data.urgency || 'PRIME'] || '#16c784';

  const signalEmoji = {
    QUALITY_EDGE: '&#x1F4CA;',
    DOG_PHYSICAL: '&#x1F4AA;',
    DOG_LEADING: '&#x1F436;',
    DOG_MEDIUM_FAV: '&#x1F436;',
    DOG_STRONG: '&#x26A1;',
    ANTI_FAV_HOT: '&#x26A0;',
  }[data.signalType] || '&#x1F514;';

  // Bet type label: "BET ML at +150" or "BET SPREAD at -4.5"
  const betTypeColor = data.betType === 'ML' ? '#f0b90b' : '#3861fb';
  const betTypeLabel = data.betType
    ? data.betType === 'ML'
      ? `BET ML at ${data.dogML != null && data.dogML > 0 ? '+' : ''}${data.dogML}`
      : `BET SPREAD at ${data.dogSpread != null && data.dogSpread > 0 ? '+' : ''}${data.dogSpread}`
    : null;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#ededed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:20px 24px 12px;text-align:center;">
          <div style="font-size:14px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">AlphaHunt</div>
          <div style="font-size:28px;font-weight:700;margin-top:8px;">${signalEmoji} BET ALERT</div>
        </td></tr>

        <!-- Signal Card -->
        <tr><td style="padding:12px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:12px;overflow:hidden;">
            <!-- Urgency bar -->
            <tr><td style="background:${urgencyColor};padding:8px 16px;text-align:center;">
              <span style="color:#0a0a0a;font-weight:700;font-size:13px;letter-spacing:1px;">${data.urgency || 'SIGNAL'}</span>
            </td></tr>

            <!-- Team + Signal -->
            <tr><td style="padding:20px 20px 12px;">
              <div style="font-size:32px;font-weight:800;color:#ededed;">${data.team}</div>
              <div style="font-size:15px;color:#6b7280;margin-top:4px;">${data.game}</div>
              <div style="margin-top:8px;">
                <span style="display:inline-block;background:#2a2a3e;color:#16c784;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:600;">${data.signalType}${data.tier ? ` (${data.tier})` : ''}</span>
                ${betTypeLabel ? `<span style="display:inline-block;background:#2a2a3e;color:${betTypeColor};padding:4px 10px;border-radius:6px;font-size:13px;font-weight:600;margin-left:6px;">${betTypeLabel}</span>` : data.recType ? `<span style="display:inline-block;background:#2a2a3e;color:#f0b90b;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:600;margin-left:6px;">${data.recType}</span>` : ''}
              </div>
            </td></tr>

            <!-- Score + Spread -->
            <tr><td style="padding:4px 20px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #2a2a3e;">
                    <span style="color:#6b7280;font-size:13px;">Score</span>
                    <span style="float:right;color:#ededed;font-weight:600;">${data.score}</span>
                  </td>
                </tr>
                ${data.spread ? `<tr><td style="padding:8px 0;border-bottom:1px solid #2a2a3e;">
                  <span style="color:#6b7280;font-size:13px;">Spread</span>
                  <span style="float:right;color:#ededed;font-weight:600;">${data.spread}</span>
                </td></tr>` : ''}
                ${data.elapsedMins ? `<tr><td style="padding:8px 0;border-bottom:1px solid #2a2a3e;">
                  <span style="color:#6b7280;font-size:13px;">Elapsed</span>
                  <span style="float:right;color:#ededed;font-weight:600;">${data.elapsedMins} min</span>
                </td></tr>` : ''}
                ${data.starName ? `<tr><td style="padding:8px 0;border-bottom:1px solid #2a2a3e;">
                  <span style="color:#6b7280;font-size:13px;">Star</span>
                  <span style="float:right;color:#f0b90b;font-weight:600;">${data.starName}</span>
                </td></tr>` : ''}
                ${data.estWinProb ? `<tr><td style="padding:8px 0;border-bottom:1px solid #2a2a3e;">
                  <span style="color:#6b7280;font-size:13px;">Win Prob</span>
                  <span style="float:right;color:#16c784;font-weight:600;">${data.estWinProb}%</span>
                </td></tr>` : ''}
                ${data.estEdge ? `<tr><td style="padding:8px 0;border-bottom:1px solid #2a2a3e;">
                  <span style="color:#6b7280;font-size:13px;">Edge</span>
                  <span style="float:right;color:#16c784;font-weight:600;">${data.estEdge}%</span>
                </td></tr>` : ''}
              </table>
            </td></tr>

            <!-- Bet Size -->
            <tr><td style="padding:0 20px 20px;">
              <div style="background:#111122;border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Bet Size${data.kellyPct ? ` (${data.kellyPct}% Kelly)` : ''}</div>
                <div style="font-size:36px;font-weight:800;color:#16c784;margin-top:4px;">$${data.betSize.toLocaleString()}</div>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 24px;text-align:center;">
          <div style="font-size:12px;color:#6b7280;">
            Fired at ${data.firedAt ? new Date(data.firedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET' : 'now'}
            &nbsp;&middot;&nbsp; alphahunt.one
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDailyDigestHtml(data: DigestData): string {
  const gameRows = data.games.map((g) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #2a2a3e;">
        <div style="font-weight:600;font-size:15px;">${g.game}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px;">${g.startTime}</div>
        ${g.watchReason ? `<div style="font-size:13px;color:#f0b90b;margin-top:4px;">${g.watchReason}</div>` : ''}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #2a2a3e;text-align:right;">
        ${g.homeSpread != null ? `<div style="font-size:14px;color:#ededed;">Spread: ${g.homeSpread > 0 ? '+' : ''}${g.homeSpread}</div>` : ''}
        ${g.homeML != null ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">ML: ${g.homeML > 0 ? '+' : ''}${g.homeML} / ${g.awayML != null && g.awayML > 0 ? '+' : ''}${g.awayML}</div>` : ''}
      </td>
    </tr>`).join('');

  const dogList = data.dogsToWatch.map((d) =>
    `<li style="padding:4px 0;color:#f0b90b;">${d}</li>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#ededed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:20px 24px 12px;text-align:center;">
          <div style="font-size:14px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">AlphaHunt</div>
          <div style="font-size:24px;font-weight:700;margin-top:8px;">&#x1F3C0; Tonight's Games</div>
          <div style="font-size:14px;color:#6b7280;margin-top:4px;">${data.date}</div>
        </td></tr>

        <!-- Games Table -->
        <tr><td style="padding:12px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:12px;overflow:hidden;">
            <tr><td colspan="2" style="padding:12px 16px;background:#111122;border-bottom:1px solid #2a2a3e;">
              <span style="font-weight:700;font-size:14px;color:#ededed;">${data.games.length} Games Tonight</span>
            </td></tr>
            ${gameRows}
          </table>
        </td></tr>

        ${data.dogsToWatch.length > 0 ? `
        <!-- Dogs to Watch -->
        <tr><td style="padding:12px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:12px 16px;background:#111122;border-bottom:1px solid #2a2a3e;">
              <span style="font-weight:700;font-size:14px;color:#ededed;">&#x1F436; Dogs to Watch</span>
            </td></tr>
            <tr><td style="padding:12px 16px;">
              <ul style="margin:0;padding:0 0 0 18px;">${dogList}</ul>
            </td></tr>
          </table>
        </td></tr>` : ''}

        ${data.notes ? `
        <tr><td style="padding:12px 24px;">
          <div style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:12px;padding:16px;">
            <div style="font-size:13px;color:#6b7280;">${data.notes}</div>
          </div>
        </td></tr>` : ''}

        <!-- Footer -->
        <tr><td style="padding:16px 24px;text-align:center;">
          <div style="font-size:12px;color:#6b7280;">
            Sent at 5:00 PM ET &nbsp;&middot;&nbsp; alphahunt.one
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
