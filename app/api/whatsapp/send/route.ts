import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTemplate, sendWhatsAppText, testWhatsAppConnection } from '@/lib/integrations/whatsapp';

function authorized(request: NextRequest) {
  const expected = process.env.WHATSAPP_INTERNAL_TOKEN?.trim();
  const supplied = request.headers.get('x-fixit-whatsapp-token')?.trim();
  return Boolean(expected && supplied && expected === supplied);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, connection: await testWhatsAppConnection() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Connection test failed.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as {
      to?: string;
      text?: string;
      templateName?: string;
      templateLanguage?: string;
      templateParameters?: string[];
    };
    const to = body.to?.trim() ?? '';
    if (!to) return NextResponse.json({ error: 'Recipient is required.' }, { status: 400 });

    const result = body.templateName
      ? await sendWhatsAppTemplate({
          to,
          name: body.templateName,
          language: body.templateLanguage,
          parameters: body.templateParameters,
        })
      : await sendWhatsAppText(to, body.text?.trim() ?? '');

    return NextResponse.json({ ok: true, to, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'WhatsApp send failed.' }, { status: 502 });
  }
}
