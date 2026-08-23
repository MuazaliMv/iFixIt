'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

type RequestFormField = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_enabled: boolean;
  is_required: boolean;
  is_protected: boolean;
  sort_order: number;
  applies_to: string[];
  options: unknown[];
  help_text: string | null;
  min_length: number | null;
  max_length: number | null;
};

const requestTypes = ['URGENT', 'STANDARD', 'SCHEDULE'] as const;
const fieldTypes = ['text', 'textarea', 'select', 'checkbox', 'date', 'time', 'number', 'photo', 'location', 'service'];

export default function RequestFormSettingsPage() {
  const [rows, setRows] = useState<RequestFormField[]>([]);
  const [message, setMessage] = useState('Loading request form settings…');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  const enabledRows = useMemo(
    () => rows.filter(row => row.is_enabled).sort((a, b) => a.sort_order - b.sort_order),
    [rows],
  );

  async function load() {
    setMessage('Loading request form settings…');
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = '/login';
      return;
    }

    const { data, error } = await supabase
      .from('request_form_fields')
      .select('id,field_key,label,field_type,is_enabled,is_required,is_protected,sort_order,applies_to,options,help_text,min_length,max_length')
      .order('sort_order', { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setRows((data || []) as RequestFormField[]);
    setMessage('Changes here control which fields are available in Request for Service.');
  }

  function patch(id: string, values: Partial<RequestFormField>) {
    setRows(current => current.map(row => row.id === id ? { ...row, ...values } : row));
  }

  function toggleAppliesTo(row: RequestFormField, type: typeof requestTypes[number]) {
    const current = row.applies_to.includes('ALL') ? [...requestTypes] : row.applies_to;
    const next = current.includes(type) ? current.filter(item => item !== type) : [...current, type];
    patch(row.id, { applies_to: next.length === requestTypes.length ? ['ALL'] : next });
  }

  async function save(row: RequestFormField) {
    setBusyId(row.id);
    setMessage(`Saving ${row.label}…`);

    const payload = {
      label: row.label.trim(),
      field_type: row.field_type,
      is_enabled: row.is_enabled,
      is_required: row.is_required,
      sort_order: Number(row.sort_order || 0),
      applies_to: row.applies_to.length ? row.applies_to : ['ALL'],
      help_text: row.help_text?.trim() || null,
      min_length: row.min_length,
      max_length: row.max_length,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('request_form_fields').update(payload).eq('id', row.id);
    setBusyId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${row.label} saved.`);
    await load();
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <a className="brand" href="/admin">FixIt</a>
          <p className="tagline">Admin • Request Form Settings</p>
        </div>
        <button className="secondary" onClick={() => void load()}>Refresh</button>
      </header>

      <AdminNav />

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">REQUEST FOR SERVICE</p>
            <h2>Control form fields</h2>
          </div>
          <span className="pill">{enabledRows.length} enabled</span>
        </div>
        <p className="formMessage" role="status">{message}</p>
        <p className="localNotice">
          Enable or hide fields, make them required or optional, rename labels, change order, and decide whether they apply to Urgent, Standard, or Scheduled requests. Protected system fields cannot be removed because the request workflow depends on them.
        </p>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">LIVE PREVIEW</p>
            <h2>Current field order</h2>
          </div>
        </div>
        <div className="jobMeta">
          {enabledRows.map(row => (
            <span key={row.id}>{row.sort_order}. {row.label}{row.is_required ? ' *' : ''}</span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">FIELDS</p>
            <h2>Request form controls</h2>
          </div>
          <span className="pill">{rows.length}</span>
        </div>

        <div className="jobList">
          {rows.map(row => (
            <article className="jobCard" key={row.id}>
              <div className="jobTop">
                <div>
                  <strong>{row.label}</strong>
                  <span className="muted">{row.field_key}</span>
                </div>
                <div className="actions">
                  {row.is_protected ? <span className="pill">PROTECTED</span> : null}
                  <span className="pill">{row.is_enabled ? 'ENABLED' : 'HIDDEN'}</span>
                </div>
              </div>

              <div className="formGrid">
                <label>
                  Field label
                  <input value={row.label} onChange={event => patch(row.id, { label: event.target.value })} />
                </label>

                <label>
                  Field type
                  <select value={row.field_type} disabled={row.is_protected} onChange={event => patch(row.id, { field_type: event.target.value })}>
                    {fieldTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>

                <label>
                  Display order
                  <input type="number" value={row.sort_order} onChange={event => patch(row.id, { sort_order: Number(event.target.value || 0) })} />
                </label>

                <label>
                  Visibility
                  <select value={row.is_enabled ? 'enabled' : 'hidden'} disabled={row.is_protected} onChange={event => patch(row.id, { is_enabled: event.target.value === 'enabled' })}>
                    <option value="enabled">Enabled</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>

                <label>
                  Requirement
                  <select value={row.is_required ? 'required' : 'optional'} disabled={row.is_protected && row.is_required} onChange={event => patch(row.id, { is_required: event.target.value === 'required' })}>
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                  </select>
                </label>

                <label>
                  Minimum length
                  <input type="number" value={row.min_length ?? ''} onChange={event => patch(row.id, { min_length: event.target.value ? Number(event.target.value) : null })} placeholder="None" />
                </label>

                <label>
                  Maximum length
                  <input type="number" value={row.max_length ?? ''} onChange={event => patch(row.id, { max_length: event.target.value ? Number(event.target.value) : null })} placeholder="None" />
                </label>

                <label className="full">
                  Help text
                  <textarea rows={2} value={row.help_text || ''} onChange={event => patch(row.id, { help_text: event.target.value })} />
                </label>
              </div>

              <div style={{ marginTop: 14 }}>
                <strong>Show for request type</strong>
                <div className="actions" style={{ marginTop: 8 }}>
                  {requestTypes.map(type => {
                    const active = row.applies_to.includes('ALL') || row.applies_to.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        className={active ? 'primary compactButton' : 'secondary compactButton'}
                        onClick={() => toggleAppliesTo(row, type)}
                      >
                        {type === 'SCHEDULE' ? 'Scheduled' : type[0] + type.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="actions" style={{ marginTop: 16 }}>
                <button className="primary" disabled={busyId === row.id} onClick={() => void save(row)}>
                  {busyId === row.id ? 'Saving…' : 'Save field'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
