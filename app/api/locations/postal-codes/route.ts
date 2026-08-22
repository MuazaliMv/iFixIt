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

async function lookup(params: { atoll: string; city: string; road: string }) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('country', 'Maldives');
  url.searchParams.set('state', params.atoll);
  url.searchParams.set('city', params.city);
  url.searchParams.set('street', params.road);
  url.searchParams.set('limit', '25');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'FixIt-Maldives/1.0 (postal-code lookup)',
    },
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    throw new Error(`Postal lookup provider returned ${response.status}`);
  }

  return (await response.json()) as NominatimResult[];
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
    const results = await lookup({ atoll, city, road });
    const postalCodes = Array.from(
      new Set(
        results
          .map((item) => clean(item.address?.postcode || null))
          .filter(validMaldivesPostalCode),
      ),
    ).sort();

    return NextResponse.json(
      { postalCodes, source: 'OpenStreetMap Nominatim' },
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
