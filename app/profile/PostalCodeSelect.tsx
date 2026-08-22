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

export default function PostalCodeSelect({ atoll, city, road, value, onChange, disabled }: Props) {
  const [postalCodes, setPostalCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const previousAddress = useRef('');

  const ready = Boolean(atoll.trim() && city.trim() && road.trim());
  const addressKey = `${atoll.trim()}|${city.trim()}|${road.trim()}`;

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
  }, [atoll, city, road, ready]);

  const options = value && !postalCodes.includes(value) ? [value, ...postalCodes] : postalCodes;

  let placeholder = 'Select Atoll, City / Island and Road first';
  if (ready && loading) placeholder = 'Finding postal codes…';
  else if (ready && error) placeholder = 'Postal lookup unavailable';
  else if (ready && !loading && postalCodes.length === 0) placeholder = 'No postal code found for this address';
  else if (ready) placeholder = 'Select Postal Code';

  return (
    <>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || !ready || loading || (postalCodes.length === 0 && !value)}
        aria-busy={loading}
      >
        <option value="">{placeholder}</option>
        {options.map((postalCode) => (
          <option key={postalCode} value={postalCode}>{postalCode}</option>
        ))}
      </select>
      {error ? <small className="muted" role="status">{error}</small> : null}
    </>
  );
}
