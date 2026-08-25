import { NextRequest, NextResponse } from 'next/server';

function clean(value: string | null) {
  return (value || '').trim();
}

function normalizeLocation(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .toLowerCase()
    .replace(/\bcity\b/g, '')
    .replace(/\batoll\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type PostalRule = {
  code: string;
  matches: (params: { atoll: string; city: string; ward: string }) => boolean;
};

/*
 * Postal codes must be resolved from an exact administrative locality, never
 * from nearby POIs, hotels, bridges, resorts, or arbitrary search results.
 *
 * Add new verified Maldives postal localities here (or replace this with the
 * postal-code master table once that table is populated).
 */
const POSTAL_RULES: PostalRule[] = [
  {
    code: '23000',
    matches: ({ city, ward }) => {
      const cityKey = normalizeLocation(city);
      const wardKey = normalizeLocation(ward);
      return cityKey === 'hulhumale' || wardKey === 'hulhumale' || wardKey.startsWith('hulhumale phase ');
    },
  },
];

function resolvePostalCodes(params: { atoll: string; city: string; ward: string }) {
  const codes = POSTAL_RULES.filter((rule) => rule.matches(params)).map((rule) => rule.code);
  return Array.from(new Set(codes));
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

  const postalCodes = resolvePostalCodes({ atoll, city, ward });

  return NextResponse.json(
    {
      postalCodes,
      source: postalCodes.length ? 'Verified Maldives locality rule' : 'No verified locality match',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
