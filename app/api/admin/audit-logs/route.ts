import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServerClient() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error('Audit log service is not configured.');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

    if (!token) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const supabase = getServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('auth_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Audit log admin-role lookup failed', profileError);
      return NextResponse.json({ error: 'Unable to verify administrator access.' }, { status: 500 });
    }

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrator role required.' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('security_events')
      .select('id,event_type,severity,entity_type,entity_id,created_at,metadata')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Audit log query failed', error);
      return NextResponse.json({ error: 'Unable to load audit logs.' }, { status: 500 });
    }

    return NextResponse.json(
      { events: data ?? [] },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Audit log API failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load audit logs.' },
      { status: 500 },
    );
  }
}
