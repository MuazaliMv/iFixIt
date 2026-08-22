import { NextRequest, NextResponse } from 'next/server';

type NominatimResult = {
  address?: {
    postcode?: string;
  };
};

function clean(value: string | null) {
  return (value || '').trim();
}

function validMaldivesPostalCode(value: string) {
  return /^\d{5}$/.test(value);
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .toLowerCase()
    .replace(/\bcity\b/g, '')
    .replace(/\batoll\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueCodes(values: string[]) {
  return Array.from(new Set(values.filter(validMaldivesPostalCode))).sort();
}

async function lookupNominatim(params: { atoll: string; city: string; road: string }) {
  const queries = [
    `${params.road}, ${params.city}, Maldives`,
    `${params.road}, ${params.city}, ${params.atoll}, Maldives`,
  ];
  const codes: string[] = [];

  for (const query of queries) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'mv');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '50');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'FixIt-Maldives/1.1 (postal-code lookup)',
      },
      next: { revalidate: 21600 },
    });

    if (!response.ok) continue;
    const results = (await response.json()) as NominatimResult[];
    for (const item of results) {
      const postcode = clean(item.address?.postcode || null);
      if (validMaldivesPostalCode(postcode)) codes.push(postcode);
    }
    if (codes.length) break;
  }

  return uniqueCodes(codes);
}

async function lookupWorldPostalCode(params: { city: string; road: string }) {
  const citySlug = slug(params.city);
  const roadSlug = slug(params.road);
  if (!citySlug || !roadSlug) return [] as string[];

  const candidates = [
    `https://worldpostalcode.com/maldives/${citySlug}/${roadSlug}`,
    `https://worldpostalcode.com/maldives/${roadSlug}`,
  ];

  for (const target of candidates) {
    try {
      const response = await fetch(target, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en',
          'User-Agent': 'FixIt-Maldives/1.1 (postal-code lookup)',
        },
        next: { revalidate: 86400 },
      });
      if (!response.ok) continue;
      const html = await response.text();
      const codes = uniqueCodes(Array.from(html.matchAll(/\b\d{5}\b/g), (match) => match[0]));
      if (codes.length) return codes;
    } catch {
      // Continue to the next candidate URL.
    }
  }

  return [] as string[];
}

export async function GET(request: NextRequest) {
  const atoll = clean(request.nextUrl.searchParams.get('atoll'));
  const city = clean(request.nextUrl.searchParams.get('city'));
  const road = clean(request.nextUrl.searchParams.get('road'));

  if (!atoll || !city || !road) {
    return NextResponse.json(
      { postalCodes: [], error: 'Atoll, city/island and road are required.' },
      { status: 400 },
    );
  }

  try {
    const osmCodes = await lookupNominatim({ atoll, city, road });
    if (osmCodes.length) {
      return NextResponse.json(
        { postalCodes: osmCodes, source: 'OpenStreetMap Nominatim' },
        { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } },
      );
    }

    const fallbackCodes = await lookupWorldPostalCode({ city, road });
    return NextResponse.json(
      {
        postalCodes: fallbackCodes,
        source: fallbackCodes.length ? 'Maldives postal-code directory fallback' : 'No matching postal source',
      },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } },
    );
  } catch (error) {
    console.error('Postal code lookup failed', error);
    return NextResponse.json(
      { postalCodes: [], error: 'Unable to retrieve postal codes right now.' },
      { status: 502 },
    );
  }
}
