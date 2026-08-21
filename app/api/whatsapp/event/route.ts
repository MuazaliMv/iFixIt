import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTemplate } from '@/lib/integrations/whatsapp';

const EVENTS = new Set([
  'REQUEST_RECEIVED',
  'PROVIDER_SEARCHING',
  'PROVIDER_ACCEPTED',
  'INSPECTION_SCHEDULED',
  'ESTIMATE_READY',
  'WORK_STARTED',
  'WORK_COMPLETED',
  'RATING_AVAILABLE',
  'RATING_EXPIRING',
  'NEW_LEAD',
  'LEAD_EXPIRING',
  'CUSTOMER_SELECTED',
  'INSPECTION_CONFIRMED',
  'ESTIMATE_APPROVED',
  'WORK_OVERDUE',
  'NEW_MESSAGE',
  'COMPLAINT',
]);

function authorized(request: NextRequest) {
  const expected = process.env.WHATSAPP_INTERNAL_TOKEN?.trim();
  const supplied = request.headers.get('x-fixit-whatsapp-token')?.trim();
  return Boolean(expected && supplied && expected === supplied);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as { event?: string; to?: string; parameters?: string[]; language?: string };
    const event = body.event?.trim().toUpperCase() ?? '';
    const to = body.to?.trim() ?? '';
    if (!EVENTS.has(event)) return NextResponse.json({ error: 'Unsupported FixIt WhatsApp event.' }, { status: 400 });
    if (!to) return NextResponse.json({ error: 'Recipient is required.' }, { status: 400 });

    const templateName = process.env[`WHATSAPP_TEMPLATE_${event}`]?.trim();
    if (!templateName) {
      return NextResponse.json({ error: `Approved Meta template is not configured for ${event}.` }, { status: 503 });
    }

    const result = await sendWhatsAppTemplate({
      to,
      name: templateName,
      language: body.language || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',
      parameters: body.parameters ?? [],
    });
    return NextResponse.json({ ok: true, event, to, templateName, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'WhatsApp event send failed.' }, { status: 502 });
  }
}
