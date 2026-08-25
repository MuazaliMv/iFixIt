import { NextRequest, NextResponse } from 'next/server';

function clean(value: string | null) {
  return (value || '').trim();
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bcity\b/g, '')
    .replace(/\batoll\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const VERIFIED_POSTAL_CODES: Array<{
  atoll?: string;
  city: string;
  ward?: string;
  postalCode: string;
}> = [
  { atoll: 'Kaafu', city: 'Male', ward: 'Hulhumale Phase 1', postalCode: '23000' },
  { atoll: 'Kaafu', city: 'Male', ward: 'Hulhumale Phase 2', postalCode: '23000' },
  { atoll: 'Kaafu', city: 'Hulhumale', postalCode: '23000' },
];

function resolvePostalCode(params: { atoll: string; city: string; ward?: string }) {
  const atoll = normalize(params.atoll);
  const city = normalize(params.city);
  const ward = normalize(params.ward || '');

  const exactWard = VERIFIED_POSTAL_CODES.find((item) => {
    const itemAtoll = normalize(item.atoll || '');
    return (!itemAtoll || itemAtoll === atoll)
      && normalize(item.city) === city
      && item.ward
      && normalize(item.ward) === ward;
  });
  if (exactWard) return exactWard.postalCode;

  const exactCity = VERIFIED_POSTAL_CODES.find((item) => {
    const itemAtoll = normalize(item.atoll || '');
    return (!itemAtoll || itemAtoll === atoll)
      && normalize(item.city) === city
      && !item.ward;
  });
  return exactCity?.postalCode || null;
}

export async function GET(request: NextRequest) {
  const atoll = clean(request.nextUrl.searchParams.get('atoll'));
  const city = clean(request.nextUrl.searchParams.get('city'));
  const ward = clean(request.nextUrl.searchParams.get('ward'));

  if (!atoll || !city) {
    return NextResponse.json(
      { postalCodes: [], error: 'Atoll and city/island are required.' },
      { status: 400 },
    );
  }

  const postalCode = resolvePostalCode({ atoll, city, ward });
  return NextResponse.json(
    {
      postalCodes: postalCode ? [postalCode] : [],
      source: postalCode ? 'Verified locality lookup' : 'No verified postal code found',
    },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
