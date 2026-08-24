'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

type RequestType = 'URGENT' | 'STANDARD' | 'SCHEDULE';
type RequestFormField = {
  id: string; field_key: string; label: string; field_type: string; is_enabled: boolean;
  is_required: boolean; is_protected: boolean; sort_order: number; applies_to: string[];
  options: unknown[]; help_text: string | null; min_length: number | null; max_length: number | null;
};
type RequestTypeRule = {
  request_type: RequestType; is_enabled: boolean; provider_response_minutes: number;
  search_expiry_minutes: number; available_providers_only: boolean; search_radius_km: number;
  surcharge_percent: number; max_providers: number; dispatch_mode: 'SIMULTANEOUS' | 'SEQUENTIAL';
  operating_start: string | null; operating_end: string | null; min_advance_minutes: number;
  max_advance_days: number; slot_minutes: number; cancellation_cutoff_minutes: number;
  reschedule_cutoff_minutes: number;
};

const requestTypes: RequestType[] = ['URGENT', 'STANDARD', 'SCHEDULE'];
const fieldTypes = ['text', 'textarea', 'select', 'checkbox', 'date', 'time', 'number', 'photo', 'location', 'service'];
const displayName = (type: RequestType) => type === 'SCHEDULE' ? 'Scheduled' : type[0] + type.slice(1).toLowerCase();

export default function RequestFormSettingsPage() {
  const [rows, setRows] = useState<RequestFormField[]>([]);
  const [rules, setRules] = useState<RequestTypeRule[]>([]);
  const [message, setMessage] = useState('Loading request form settings…');
  const [busyId, setBusyId] = useState<string | null>(null);
  const enabledRows = useMemo(() => rows.filter(row => row.is_enabled).sort((a, b) => a.sort_order - b.sort_order), [rows]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setMessage('Loading request form settings…');
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { window.location.href = '/login'; return; }
    const [{ data: fieldData, error: fieldError }, { data: ruleData, error: ruleError }] = await Promise.all([
      supabase.from('request_form_fields').select('id,field_key,label,field_type,is_enabled,is_required,is_protected,sort_order,applies_to,options,help_text,min_length,max_length').order('sort_order', { ascending: true }),
      supabase.from('request_type_settings').select('*').order('request_type', { ascending: true }),
    ]);
    if (fieldError || ruleError) { setMessage(fieldError?.message || ruleError?.message || 'Unable to load settings.'); return; }
    setRows((fieldData || []) as RequestFormField[]);
    setRules((ruleData || []) as RequestTypeRule[]);
    setMessage('Changes here control the customer Request for Service form.');
  }

  function patchField(id: string, values: Partial<RequestFormField>) {
    setRows(current => current.map(row => row.id === id ? { ...row, ...values } : row));
  }
  function patchRule(type: RequestType, values: Partial<RequestTypeRule>) {
    setRules(current => current.map(rule => rule.request_type === type ? { ...rule, ...values } : rule));
  }
  function toggleAppliesTo(row: RequestFormField, type: RequestType) {
    const current = row.applies_to.includes('ALL') ? [...requestTypes] : row.applies_to;
    const next = current.includes(type) ? current.filter(item => item !== type) : [...current, type];
    patchField(row.id, { applies_to: next.length === requestTypes.length ? ['ALL'] : next });
  }

  async function saveRule(rule: RequestTypeRule) {
    if (!rule.is_enabled && rules.filter(item => item.request_type !== rule.request_type && item.is_enabled).length === 0) {
      setMessage('At least one request type must remain enabled.'); return;
    }
    setBusyId(`rule:${rule.request_type}`);
    const enabledTypes = rules.map(item => item.request_type === rule.request_type ? rule : item).filter(item => item.is_enabled).map(item => item.request_type);
    const { error: ruleError } = await supabase.from('request_type_settings').update({
      is_enabled: rule.is_enabled,
      provider_response_minutes: Number(rule.provider_response_minutes), search_expiry_minutes: Number(rule.search_expiry_minutes),
      available_providers_only: rule.available_providers_only, search_radius_km: Number(rule.search_radius_km),
      surcharge_percent: Number(rule.surcharge_percent), max_providers: Number(rule.max_providers), dispatch_mode: rule.dispatch_mode,
      operating_start: rule.operating_start || null, operating_end: rule.operating_end || null,
      min_advance_minutes: Number(rule.min_advance_minutes), max_advance_days: Number(rule.max_advance_days),
      slot_minutes: Number(rule.slot_minutes), cancellation_cutoff_minutes: Number(rule.cancellation_cutoff_minutes),
      reschedule_cutoff_minutes: Number(rule.reschedule_cutoff_minutes), updated_at: new Date().toISOString(),
    }).eq('request_type', rule.request_type);
    if (!ruleError) {
      const { error: linkError } = await supabase.from('request_form_fields').update({ options: enabledTypes, updated_at: new Date().toISOString() }).eq('field_key', 'urgency');
      if (linkError) { setBusyId(null); setMessage(linkError.message); return; }
    }
    setBusyId(null);
    if (ruleError) { setMessage(ruleError.message); return; }
    setMessage(`${displayName(rule.request_type)} rules saved and linked to the customer request form.`);
    await load();
  }

  async function saveField(row: RequestFormField) {
    setBusyId(row.id);
    const payload = {
      label: row.label.trim(), field_type: row.field_type, is_enabled: row.is_enabled,
      is_required: row.is_required, sort_order: Number(row.sort_order || 0),
      applies_to: row.applies_to.length ? row.applies_to : ['ALL'], help_text: row.help_text?.trim() || null,
      min_length: row.min_length, max_length: row.max_length, updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('request_form_fields').update(payload).eq('id', row.id);
    setBusyId(null);
    if (error) { setMessage(error.message); return; }
    setMessage(`${row.label} saved.`); await load();
  }

  return <main className="shell">
    <header className="topbar"><div><a className="brand" href="/admin">FixIt</a><p className="tagline">Admin • Request Form Settings</p></div><button className="secondary" onClick={() => void load()}>Refresh</button></header>
    <AdminNav />

    <section className="panel">
      <div className="panelHeader"><div><p className="eyebrow">REQUEST TYPES</p><h2>Urgent, Standard & Scheduled</h2></div><span className="pill">{rules.filter(r => r.is_enabled).length} enabled</span></div>
      <p className="formMessage" role="status">{message}</p>
      <p className="localNotice">Enable or disable each request type and configure its operating rules. Disabled request types are removed from the customer Request for Service form. At least one type must remain enabled.</p>
      <div className="jobList">
        {rules.map(rule => <article className="jobCard" key={rule.request_type}>
          <div className="jobTop"><div><strong>{displayName(rule.request_type)}</strong><span className="muted">Customer request urgency option</span></div><div className="actions"><span className="pill">{rule.is_enabled ? 'ENABLED' : 'DISABLED'}</span></div></div>
          <div className="formGrid">
            <label>Availability<select value={rule.is_enabled ? 'enabled' : 'disabled'} onChange={e => patchRule(rule.request_type, { is_enabled: e.target.value === 'enabled' })}><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></label>
            <label>Provider response time (minutes)<input type="number" min="1" value={rule.provider_response_minutes} onChange={e => patchRule(rule.request_type, { provider_response_minutes: Number(e.target.value) })} /></label>
            <label>Search expiry (minutes)<input type="number" min="1" value={rule.search_expiry_minutes} onChange={e => patchRule(rule.request_type, { search_expiry_minutes: Number(e.target.value) })} /></label>
            <label>Search radius (km)<input type="number" min="1" step="0.5" value={rule.search_radius_km} onChange={e => patchRule(rule.request_type, { search_radius_km: Number(e.target.value) })} /></label>
            <label>Maximum providers notified<input type="number" min="1" value={rule.max_providers} onChange={e => patchRule(rule.request_type, { max_providers: Number(e.target.value) })} /></label>
            <label>Dispatch method<select value={rule.dispatch_mode} onChange={e => patchRule(rule.request_type, { dispatch_mode: e.target.value as RequestTypeRule['dispatch_mode'] })}><option value="SIMULTANEOUS">Simultaneous</option><option value="SEQUENTIAL">Sequential</option></select></label>
            <label>Urgent / service surcharge (%)<input type="number" min="0" step="0.5" value={rule.surcharge_percent} onChange={e => patchRule(rule.request_type, { surcharge_percent: Number(e.target.value) })} /></label>
            <label>Provider availability<select value={rule.available_providers_only ? 'available' : 'all'} onChange={e => patchRule(rule.request_type, { available_providers_only: e.target.value === 'available' })}><option value="available">Currently available only</option><option value="all">Eligible providers</option></select></label>
            <label>Operating start<input type="time" value={rule.operating_start || ''} onChange={e => patchRule(rule.request_type, { operating_start: e.target.value || null })} /></label>
            <label>Operating end<input type="time" value={rule.operating_end || ''} onChange={e => patchRule(rule.request_type, { operating_end: e.target.value || null })} /></label>
            <label>Minimum advance (minutes)<input type="number" min="0" value={rule.min_advance_minutes} onChange={e => patchRule(rule.request_type, { min_advance_minutes: Number(e.target.value) })} /></label>
            <label>Maximum advance (days)<input type="number" min="1" value={rule.max_advance_days} onChange={e => patchRule(rule.request_type, { max_advance_days: Number(e.target.value) })} /></label>
            <label>Schedule slot (minutes)<input type="number" min="1" value={rule.slot_minutes} onChange={e => patchRule(rule.request_type, { slot_minutes: Number(e.target.value) })} /></label>
            <label>Cancellation cutoff (minutes)<input type="number" min="0" value={rule.cancellation_cutoff_minutes} onChange={e => patchRule(rule.request_type, { cancellation_cutoff_minutes: Number(e.target.value) })} /></label>
            <label>Reschedule cutoff (minutes)<input type="number" min="0" value={rule.reschedule_cutoff_minutes} onChange={e => patchRule(rule.request_type, { reschedule_cutoff_minutes: Number(e.target.value) })} /></label>
          </div>
          <div className="actions" style={{ marginTop: 16 }}><button className="primary" disabled={busyId === `rule:${rule.request_type}`} onClick={() => void saveRule(rule)}>{busyId === `rule:${rule.request_type}` ? 'Saving…' : `Save ${displayName(rule.request_type)} rules`}</button></div>
        </article>)}
      </div>
    </section>

    <section className="panel"><div className="panelHeader"><div><p className="eyebrow">LIVE PREVIEW</p><h2>Current field order</h2></div><span className="pill">{enabledRows.length} enabled</span></div><div className="jobMeta">{enabledRows.map(row => <span key={row.id}>{row.sort_order}. {row.label}{row.is_required ? ' *' : ''}</span>)}</div></section>

    <section className="panel">
      <div className="panelHeader"><div><p className="eyebrow">FIELDS</p><h2>Request form controls</h2></div><span className="pill">{rows.length}</span></div>
      <div className="jobList">{rows.map(row => <article className="jobCard" key={row.id}>
        <div className="jobTop"><div><strong>{row.label}</strong><span className="muted">{row.field_key}</span></div><div className="actions">{row.is_protected ? <span className="pill">PROTECTED</span> : null}<span className="pill">{row.is_enabled ? 'ENABLED' : 'HIDDEN'}</span></div></div>
        <div className="formGrid">
          <label>Field label<input value={row.label} onChange={e => patchField(row.id, { label: e.target.value })} /></label>
          <label>Field type<select value={row.field_type} disabled={row.is_protected} onChange={e => patchField(row.id, { field_type: e.target.value })}>{fieldTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
          <label>Display order<input type="number" value={row.sort_order} onChange={e => patchField(row.id, { sort_order: Number(e.target.value || 0) })} /></label>
          <label>Visibility<select value={row.is_enabled ? 'enabled' : 'hidden'} disabled={row.is_protected} onChange={e => patchField(row.id, { is_enabled: e.target.value === 'enabled' })}><option value="enabled">Enabled</option><option value="hidden">Hidden</option></select></label>
          <label>Requirement<select value={row.is_required ? 'required' : 'optional'} disabled={row.is_protected && row.is_required} onChange={e => patchField(row.id, { is_required: e.target.value === 'required' })}><option value="required">Required</option><option value="optional">Optional</option></select></label>
          <label>Minimum length<input type="number" value={row.min_length ?? ''} onChange={e => patchField(row.id, { min_length: e.target.value ? Number(e.target.value) : null })} placeholder="None" /></label>
          <label>Maximum length<input type="number" value={row.max_length ?? ''} onChange={e => patchField(row.id, { max_length: e.target.value ? Number(e.target.value) : null })} placeholder="None" /></label>
          <label className="full">Help text<textarea rows={2} value={row.help_text || ''} onChange={e => patchField(row.id, { help_text: e.target.value })} /></label>
        </div>
        <div style={{ marginTop: 14 }}><strong>Show for request type</strong><div className="actions" style={{ marginTop: 8 }}>{requestTypes.map(type => { const active = row.applies_to.includes('ALL') || row.applies_to.includes(type); return <button key={type} type="button" className={active ? 'primary compactButton' : 'secondary compactButton'} onClick={() => toggleAppliesTo(row, type)}>{displayName(type)}</button>; })}</div></div>
        <div className="actions" style={{ marginTop: 16 }}><button className="primary" disabled={busyId === row.id} onClick={() => void saveField(row)}>{busyId === row.id ? 'Saving…' : 'Save field'}</button></div>
      </article>)}</div>
    </section>
  </main>;
}
