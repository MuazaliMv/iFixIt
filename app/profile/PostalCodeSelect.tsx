'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  atoll: string;
  city: string;
  road: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type LookupResponse = {
  postalCodes?: string[];
  error?: string;
};

type WardLookupResponse = {
  wards?: string[];
  error?: string;
};

function normalizedCity(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bcity\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function fallbackWards(city: string) {
  const key = normalizedCity(city);
  if (key === 'male') return ['Galolhu', 'Henveiru', 'Maafannu', 'Machangolhi', 'Hulhumalé Phase 1', 'Hulhumalé Phase 2', 'Villimalé'];
  if (key === 'hulhumale') return ['Hulhumalé Phase 1', 'Hulhumalé Phase 2'];
  if (key === 'villimale') return ['Villimalé'];
  return [] as string[];
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function normalizeWardList(city: string, values: string[]) {
  const key = normalizedCity(city);
  const filtered = key === 'male'
    ? values.filter((item) => normalizedCity(item) !== 'hulhumale')
    : values;
  return unique(filtered);
}

export default function PostalCodeSelect({ atoll, city, road, value, onChange, disabled }: Props) {
  const [ward, setWard] = useState('');
  const [wards, setWards] = useState<string[]>([]);
  const [wardLoading, setWardLoading] = useState(false);
  const [postalCodes, setPostalCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const previousAddress = useRef('');

  const wardReady = Boolean(atoll.trim() && city.trim());
  const ready = Boolean(atoll.trim() && city.trim() && road.trim());
  const addressKey = `${atoll.trim()}|${city.trim()}|${road.trim()}|${ward.trim()}`;

  useEffect(() => {
    setWard('');
    const localWards = fallbackWards(city);
    setWards(normalizeWardList(city, localWards));
    if (!wardReady) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setWardLoading(true);
      try {
        const params = new URLSearchParams({ atoll, city });
        const response = await fetch(`/api/locations/wards?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as WardLookupResponse;
        if (!response.ok) throw new Error(payload.error || 'Unable to load wards.');
        const remoteWards = Array.isArray(payload.wards) ? payload.wards : [];
        setWards(normalizeWardList(city, [...localWards, ...remoteWards]));
      } catch {
        if (!controller.signal.aborted) setWards(normalizeWardList(city, localWards));
      } finally {
        if (!controller.signal.aborted) setWardLoading(false);
      }
    }, 150);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [atoll, city, wardReady]);

  useEffect(() => {
    if (previousAddress.current && previousAddress.current !== addressKey && value) {
      onChange('');
    }
    previousAddress.current = addressKey;
  }, [addressKey, onChange, value]);

  useEffect(() => {
    if (!ready) {
      setPostalCodes([]);
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ atoll, city, road });
        if (ward) params.set('ward', ward);
        const response = await fetch(`/api/locations/postal-codes?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as LookupResponse;
        if (!response.ok) throw new Error(payload.error || 'Unable to load postal codes.');
        setPostalCodes(Array.isArray(payload.postalCodes) ? payload.postalCodes : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setPostalCodes([]);
        setError(err instanceof Error ? err.message : 'Unable to load postal codes.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [atoll, city, road, ward, ready]);

  const options = value && !postalCodes.includes(value) ? [value, ...postalCodes] : postalCodes;

  let postalPlaceholder = 'Select Atoll, City / Island and Road first';
  if (ready && loading) postalPlaceholder = 'Finding postal codes…';
  else if (ready && error) postalPlaceholder = 'Postal lookup unavailable';
  else if (ready && !loading && postalCodes.length === 0) postalPlaceholder = 'No postal code found for this address';
  else if (ready) postalPlaceholder = 'Select Postal Code';

  let wardPlaceholder = 'Select City / Island first';
  if (wardReady && wardLoading && wards.length === 0) wardPlaceholder = 'Loading wards…';
  else if (wardReady && wards.length === 0) wardPlaceholder = 'No ward listed / Not applicable';
  else if (wardReady) wardPlaceholder = 'Select Ward';

  return (
    <div className="wardPostalControl">
      <style>{`.scheduleGrid label:has(.wardPostalControl){font-size:0}.wardPostalControl{font-size:16px;display:grid;gap:8px}.wardPostalControl .fieldLabel{font-size:inherit;font-weight:700;line-height:1.25;margin-top:2px}.wardPostalControl select,.wardPostalControl small{font-size:16px}`}</style>
      <span className="fieldLabel">Ward</span>
      <select
        value={ward}
        onChange={(event) => setWard(event.target.value)}
        disabled={disabled || !wardReady || (wardLoading && wards.length === 0) || wards.length === 0}
        aria-label="Ward"
        aria-busy={wardLoading}
      >
        <option value="">{wardPlaceholder}</option>
        {wards.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <span className="fieldLabel">Postal code</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || !ready || loading || (postalCodes.length === 0 && !value)}
        aria-label="Postal code"
        aria-busy={loading}
      >
        <option value="">{postalPlaceholder}</option>
        {options.map((postalCode) => (
          <option key={postalCode} value={postalCode}>{postalCode}</option>
        ))}
      </select>
      {error ? <small className="muted" role="status">{error}</small> : null}
    </div>
  );
}
