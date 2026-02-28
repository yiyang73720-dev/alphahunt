import twilio from 'twilio';

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

interface CallAlertData {
  team: string;
  signalType: string;
  tier?: string;
  score: string;
  betSize: number;
  betType?: 'ML' | 'SPREAD';
  dogML?: number;
  dogSpread?: number;
}

// ========================================
// Voice Call (Tier 2+ signals only)
// ========================================

export async function sendVoiceAlert(data: CallAlertData): Promise<{ success: boolean; error?: string }> {
  const client = getClient();
  if (!client) return { success: false, error: 'Twilio not configured' };

  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.USER_PHONE_NUMBER || process.env.ALERT_PHONE;
  if (!fromNumber || !toNumber) return { success: false, error: 'Phone numbers not configured' };

  // Build TwiML speech
  const tierText = data.tier ? `, ${data.tier} tier` : '';
  const betTypeText = data.betType
    ? data.betType === 'ML'
      ? `. Dog M L bet at ${data.dogML != null && data.dogML > 0 ? 'plus ' : 'minus '}${Math.abs(data.dogML || 0)}`
      : `. Dog spread bet at ${data.dogSpread}`
    : '';
  const message = [
    'Bet alert.',
    `${data.team} ${data.signalType.replace(/_/g, ' ')}${tierText}${betTypeText}.`,
    `Score: ${data.score}.`,
    `Bet ${data.betSize} dollars.`,
    'Check Alpha Hunt for details.',
  ].join(' ');

  const twiml = `<Response><Say voice="alice" language="en-US">${escapeXml(message)}</Say><Pause length="1"/><Say voice="alice" language="en-US">${escapeXml(message)}</Say></Response>`;

  try {
    const call = await client.calls.create({
      twiml,
      to: toNumber,
      from: fromNumber,
    });

    return { success: true, error: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ========================================
// SMS (Tier 1 / Simple signals)
// ========================================

export async function sendSmsAlert(data: CallAlertData): Promise<{ success: boolean; error?: string }> {
  const client = getClient();
  if (!client) return { success: false, error: 'Twilio not configured' };

  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.USER_PHONE_NUMBER || process.env.ALERT_PHONE;
  if (!fromNumber || !toNumber) return { success: false, error: 'Phone numbers not configured' };

  const tierText = data.tier ? ` (${data.tier})` : '';
  const betTypeText = data.betType
    ? data.betType === 'ML'
      ? `\nBET ML at ${data.dogML != null && data.dogML > 0 ? '+' : ''}${data.dogML}`
      : `\nBET SPREAD at ${data.dogSpread != null && data.dogSpread > 0 ? '+' : ''}${data.dogSpread}`
    : '';
  const body = [
    `BET ALERT: ${data.team} ${data.signalType}${tierText}`,
    `Score: ${data.score}${betTypeText}`,
    `Bet: $${data.betSize.toLocaleString()}`,
    `— AlphaHunt`,
  ].join('\n');

  try {
    await client.messages.create({
      body,
      to: toNumber,
      from: fromNumber,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ========================================
// Route alert by signal tier
// ========================================

export async function sendPhoneAlert(
  data: CallAlertData,
  signalCount: number,
): Promise<{ method: 'call' | 'sms'; success: boolean; error?: string }> {
  // Tier 2+ (signalCount >= 2) = phone call
  // Tier 1 / simple = SMS
  if (signalCount >= 2) {
    const result = await sendVoiceAlert(data);
    return { method: 'call', ...result };
  }

  const result = await sendSmsAlert(data);
  return { method: 'sms', ...result };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
