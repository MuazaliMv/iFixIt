import 'server-only';

const GRAPH_BASE = 'https://graph.facebook.com';
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

type WhatsAppProvider = 'META' | 'TWILIO';

function provider(): WhatsAppProvider {
  const value = (process.env.WHATSAPP_PROVIDER || 'META').trim().toUpperCase();
  if (value !== 'META' && value !== 'TWILIO') throw new Error('WHATSAPP_PROVIDER must be META or TWILIO.');
  return value;
}

function metaConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? '';
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? '';
  const missing = [
    !accessToken && 'WHATSAPP_ACCESS_TOKEN',
    !phoneNumberId && 'WHATSAPP_PHONE_NUMBER_ID',
    !graphVersion && 'WHATSAPP_GRAPH_API_VERSION',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Meta WhatsApp is not configured: ${missing.join(', ')}`);
  if (!/^v\d+\.\d+$/.test(graphVersion)) throw new Error('Invalid WHATSAPP_GRAPH_API_VERSION.');
  if (!/^\d+$/.test(phoneNumberId)) throw new Error('Invalid WHATSAPP_PHONE_NUMBER_ID.');
  return { accessToken, phoneNumberId, graphVersion };
}

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? '';
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? '';
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim() ?? '';
  const statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL?.trim() || undefined;
  const missing = [
    !accountSid && 'TWILIO_ACCOUNT_SID',
    !authToken && 'TWILIO_AUTH_TOKEN',
    !from && 'TWILIO_WHATSAPP_FROM',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Twilio WhatsApp is not configured: ${missing.join(', ')}`);
  if (!/^AC[a-fA-F0-9]{32}$/.test(accountSid)) throw new Error('Invalid TWILIO_ACCOUNT_SID.');
  return { accountSid, authToken, from: normalizeWhatsAppAddress(from), statusCallback };
}

export function normalizeWhatsAppNumber(value: string) {
  const normalized = value.replace(/[\s()+-]/g, '');
  if (!/^\d{8,15}$/.test(normalized)) throw new Error('Recipient must be an international phone number.');
  return normalized;
}

function normalizeWhatsAppAddress(value: string) {
  const raw = value.trim().replace(/^whatsapp:/i, '');
  const digits = normalizeWhatsAppNumber(raw);
  return `whatsapp:+${digits}`;
}

async function postMetaMessage(payload: Record<string, unknown>) {
  const { accessToken, phoneNumberId, graphVersion } = metaConfig();
  const response = await fetch(`${GRAPH_BASE}/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...payload }),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as {
    error?: { message?: string; code?: number };
    messages?: Array<{ id?: string; message_status?: string }>;
    contacts?: Array<{ wa_id?: string }>;
  };
  if (!response.ok) throw new Error(body.error?.message || `Meta WhatsApp API failed (${response.status}).`);
  const messageId = body.messages?.[0]?.id;
  if (!messageId) throw new Error('Meta WhatsApp API did not return a message id.');
  return { provider: 'META' as const, messageId, status: body.messages?.[0]?.message_status ?? null, waId: body.contacts?.[0]?.wa_id ?? null };
}

async function postTwilioMessage(fields: Record<string, string>) {
  const { accountSid, authToken, from, statusCallback } = twilioConfig();
  const form = new URLSearchParams({ From: from, ...fields });
  if (statusCallback) form.set('StatusCallback', statusCallback);

  const response = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: form.toString(),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as {
    sid?: string;
    status?: string;
    to?: string;
    error_message?: string | null;
    message?: string;
  };
  if (!response.ok || !body.sid) throw new Error(body.message || body.error_message || `Twilio WhatsApp API failed (${response.status}).`);
  return { provider: 'TWILIO' as const, messageId: body.sid, status: body.status ?? null, waId: null };
}

export async function sendWhatsAppText(to: string, body: string) {
  const text = body.trim();
  if (!text || text.length > 4096) throw new Error('WhatsApp text must contain 1–4096 characters.');

  if (provider() === 'TWILIO') {
    return postTwilioMessage({ To: normalizeWhatsAppAddress(to), Body: text });
  }

  return postMetaMessage({ to: normalizeWhatsAppNumber(to), type: 'text', text: { body: text, preview_url: false } });
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  name: string;
  language?: string;
  parameters?: string[];
}) {
  if (provider() === 'TWILIO') {
    const contentVariables = Object.fromEntries((input.parameters ?? []).map((value, index) => [String(index + 1), String(value)]));
    return postTwilioMessage({
      To: normalizeWhatsAppAddress(input.to),
      ContentSid: input.name,
      ...(Object.keys(contentVariables).length ? { ContentVariables: JSON.stringify(contentVariables) } : {}),
    });
  }

  const parameters = (input.parameters ?? []).map((text) => ({ type: 'text', text: String(text) }));
  return postMetaMessage({
    to: normalizeWhatsAppNumber(input.to),
    type: 'template',
    template: {
      name: input.name,
      language: { code: input.language || 'en' },
      ...(parameters.length ? { components: [{ type: 'body', parameters }] } : {}),
    },
  });
}

export async function testWhatsAppConnection() {
  if (provider() === 'TWILIO') {
    const { accountSid, authToken, from } = twilioConfig();
    const response = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}.json`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const body = await response.json().catch(() => ({})) as { sid?: string; friendly_name?: string; status?: string; message?: string };
    if (!response.ok || !body.sid) throw new Error(body.message || 'Twilio connection test failed.');
    return { provider: 'TWILIO' as const, accountSid: body.sid, friendlyName: body.friendly_name ?? null, accountStatus: body.status ?? null, from };
  }

  const { accessToken, phoneNumberId, graphVersion } = metaConfig();
  const response = await fetch(`${GRAPH_BASE}/${graphVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as { id?: string; display_phone_number?: string; verified_name?: string; error?: { message?: string } };
  if (!response.ok || !body.id) throw new Error(body.error?.message || 'WhatsApp connection test failed.');
  return { provider: 'META' as const, phoneNumberId: body.id, displayPhoneNumber: body.display_phone_number ?? null, verifiedName: body.verified_name ?? null };
}
