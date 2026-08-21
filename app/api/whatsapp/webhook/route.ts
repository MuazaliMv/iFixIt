import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret || !signature?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  return `sha256=${hex(digest)}` === signature;
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!(await verifySignature(rawBody, request.headers.get('x-hub-signature-256')))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as any;
  const rows: Array<Record<string, unknown>> = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const status of change?.value?.statuses ?? []) {
        const error = status?.errors?.[0];
        rows.push({
          message_id: status?.id ?? null,
          recipient_wa_id: status?.recipient_id ?? null,
          status: status?.status ?? 'unknown',
          event_timestamp: status?.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : null,
          error_code: error?.code != null ? String(error.code) : null,
          error_title: error?.title ?? null,
          error_message: error?.message ?? error?.error_data?.details ?? null,
          payload: status,
        });
      }
    }
  }

  if (rows.length) {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (url && serviceKey) {
      const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
      const { error } = await supabase.from('whatsapp_delivery_events').insert(rows);
      if (error) console.error('WhatsApp delivery log insert failed', error);
    }
  }

  return NextResponse.json({ received: true });
}
