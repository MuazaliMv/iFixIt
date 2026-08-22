import { NextRequest, NextResponse } from 'next/server';

type NominatimResult = {
  address?: {
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
  };
};

function clean(value: string | null | undefined) {
  return (value || '').trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

const KNOWN_WARDS: Record<string, string[]> = {
  'male': ['Galolhu', 'Henveiru', 'Maafannu', 'Machangolhi'],
  'malé': ['Galolhu', 'Henveiru', 'Maafannu', 'Machangolhi'],
  'male city': ['Galolhu', 'Henveiru', 'Maafannu', 'Machangolhi'],
  'malé city': ['Galolhu', 'Henveiru', 'Maafannu', 'Machangolhi'],
  'hulhumale': ['Hulhumalé Phase 1', 'Hulhumalé Phase 2'],
  'hulhumalé': ['Hulhumalé Phase 1', 'Hulhumalé Phase 2'],
  'villimale': ['Villimalé'],
  'villimalé': ['Villimalé'],
};

async function lookupNominatim(atoll: string, city: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'mv');
  url.searchParams.set('q', `${city}, ${atoll}, Maldives`);
  url.searchParams.set('limit', '50');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'FixIt-Maldives/1.1 (ward lookup)',
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) return [] as string[];
  const results = (await response.json()) as NominatimResult[];
  const values: string[] = [];
  for (const item of results) {
    const address = item.address || {};
    for (const ward of [address.city_district, address.suburb, address.quarter, address.neighbourhood]) {
      if (ward) values.push(ward);
    }
  }
  return unique(values);
}

export async function GET(request: NextRequest) {
  const atoll = clean(request.nextUrl.searchParams.get('atoll'));
  const city = clean(request.nextUrl.searchParams.get('city'));

  if (!atoll || !city) {
    return NextResponse.json({ wards: [], error: 'Atoll and city/island are required.' }, { status: 400 });
  }

  const known = KNOWN_WARDS[city.toLowerCase()] || [];

  try {
    const remote = await lookupNominatim(atoll, city);
    const wards = unique([...known, ...remote]);
    return NextResponse.json(
      { wards, source: known.length ? 'FixIt Maldives ward catalogue + OpenStreetMap' : 'OpenStreetMap' },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
    );
  } catch (error) {
    console.error('Ward lookup failed', error);
    return NextResponse.json(
      { wards: unique(known), source: known.length ? 'FixIt Maldives ward catalogue' : 'No matching ward source' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  }
}
