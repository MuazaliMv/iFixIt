import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const FALLBACK_SUPABASE_URL = 'https://yzlhlilxiszefneshatm.supabase.co';
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_1sZEZgz9k2JACE_WzHtbCw_reiQEik6';

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 3000;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/(bearer\s+)[a-z0-9._-]+/gi, '$1[REDACTED]')
    .replace(/(password|token|secret|authorization|cookie)=([^\s&]+)/gi, '$1=[REDACTED]')
    .slice(0, maxLength);
}

function getServerClient(token: string) {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_ANON_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || FALLBACK_PUBLISHABLE_KEY;

  const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: usingServiceRole ? undefined : { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const supabase = getServerClient(token);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });

    const severity = ['info', 'warning', 'error', 'critical'].includes(String(body.severity))
      ? String(body.severity)
      : 'error';

    const metadata = {
      log_model: 'system',
      source: 'client-runtime',
      result: 'failed',
      message: cleanText(body.message, MAX_MESSAGE_LENGTH) || 'Unexpected application error',
      stack: cleanText(body.stack, MAX_STACK_LENGTH) || null,
      route: cleanText(body.route, 300) || null,
      component: cleanText(body.component, 160) || null,
      action: cleanText(body.action, 160) || null,
      error_code: cleanText(body.errorCode, 120) || null,
      browser_online: typeof body.online === 'boolean' ? body.online : null,
      user_agent: cleanText(request.headers.get('user-agent'), 300) || null,
      reported_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('security_events').insert({
      user_id: userData.user.id,
      event_type: 'system.client_error',
      severity,
      entity_type: 'application_runtime',
      entity_id: null,
      metadata,
    });

    if (insertError) {
      console.error('Client error report insert failed', insertError);
      return NextResponse.json({ error: 'Unable to record error report.' }, { status: 500 });
    }

    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch (error) {
    console.error('Client error reporting API failed', error);
    return NextResponse.json({ error: 'Unable to record error report.' }, { status: 500 });
  }
}
