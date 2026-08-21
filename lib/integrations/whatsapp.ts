import 'server-only';

const GRAPH_BASE = 'https://graph.facebook.com';

function config() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? '';
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? '';
  const missing = [
    !accessToken && 'WHATSAPP_ACCESS_TOKEN',
    !phoneNumberId && 'WHATSAPP_PHONE_NUMBER_ID',
    !graphVersion && 'WHATSAPP_GRAPH_API_VERSION',
  ].filter(Boolean);
  if (missing.length) throw new Error(`WhatsApp is not configured: ${missing.join(', ')}`);
  if (!/^v\d+\.\d+$/.test(graphVersion)) throw new Error('Invalid WHATSAPP_GRAPH_API_VERSION.');
  if (!/^\d+$/.test(phoneNumberId)) throw new Error('Invalid WHATSAPP_PHONE_NUMBER_ID.');
  return { accessToken, phoneNumberId, graphVersion };
}

export function normalizeWhatsAppNumber(value: string) {
  const normalized = value.replace(/[\s()+-]/g, '');
  if (!/^\d{8,15}$/.test(normalized)) throw new Error('Recipient must be an international phone number.');
  return normalized;
}

async function postMessage(payload: Record<string, unknown>) {
  const { accessToken, phoneNumberId, graphVersion } = config();
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
  if (!response.ok) throw new Error(body.error?.message || `WhatsApp API failed (${response.status}).`);
  const messageId = body.messages?.[0]?.id;
  if (!messageId) throw new Error('WhatsApp API did not return a message id.');
  return { messageId, status: body.messages?.[0]?.message_status ?? null, waId: body.contacts?.[0]?.wa_id ?? null };
}

export async function sendWhatsAppText(to: string, body: string) {
  const text = body.trim();
  if (!text || text.length > 4096) throw new Error('WhatsApp text must contain 1–4096 characters.');
  return postMessage({ to: normalizeWhatsAppNumber(to), type: 'text', text: { body: text, preview_url: false } });
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  name: string;
  language?: string;
  parameters?: string[];
}) {
  const parameters = (input.parameters ?? []).map((text) => ({ type: 'text', text: String(text) }));
  return postMessage({
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
  const { accessToken, phoneNumberId, graphVersion } = config();
  const response = await fetch(`${GRAPH_BASE}/${graphVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as { id?: string; display_phone_number?: string; verified_name?: string; error?: { message?: string } };
  if (!response.ok || !body.id) throw new Error(body.error?.message || 'WhatsApp connection test failed.');
  return { phoneNumberId: body.id, displayPhoneNumber: body.display_phone_number ?? null, verifiedName: body.verified_name ?? null };
}
