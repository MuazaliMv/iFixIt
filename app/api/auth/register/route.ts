import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const clean = (value: unknown, max = 320) => String(value ?? '').trim().slice(0, max);
const normalizePhone = (value: unknown) => {
  const raw = clean(value, 32).replace(/[\s()-]/g, '');
  if (!raw) return '';
  return /^\+[1-9][0-9]{7,14}$/.test(raw) ? raw : '';
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const fullName = clean(body.fullName, 120);
    const email = clean(body.email, 320).toLowerCase();
    const password = String(body.password ?? '');
    const role = clean(body.role || 'CUSTOMER', 20).toUpperCase();
    const rawPhone = clean(body.phoneNumber, 32);
    const phone = normalizePhone(rawPhone);

    if (!fullName || !email.includes('@') || password.length < 8) {
      return NextResponse.json({ error: 'Name, valid email and a password of at least 8 characters are required.' }, { status: 400 });
    }
    if (!['CUSTOMER', 'PROVIDER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid account type.' }, { status: 400 });
    }
    if (rawPhone && !phone) {
      return NextResponse.json({ error: 'Phone number must use international format, for example +9607XXXXXX.' }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceKey) {
      console.error('Registration unavailable: Supabase server credentials are not configured.');
      return NextResponse.json({ error: 'Registration is temporarily unavailable.' }, { status: 503 });
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        ...(phone ? { phone_number: phone, is_phone_verified: false } : {}),
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (phone && created.user) {
      await admin.from('auth_profiles').update({
        phone_number: phone,
        is_phone_verified: false,
      }).eq('user_id', created.user.id);
    }

    return NextResponse.json({
      ok: true,
      userId: created.user.id,
      message: 'Account created. You can now sign in.',
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 });
  }
}
