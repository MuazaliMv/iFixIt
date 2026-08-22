'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

type AuditRow = {
  id: string;
  event_type: string;
  severity: string;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

type LoadState = 'loading' | 'ready' | 'error' | 'forbidden';

const PAGE_SIZE = 10;

const LOG_MODELS = [
  { key: 'authentication', label: 'Authentication Logs', icon: '🔐', keywords: ['auth', 'login', 'sign_in', 'sign-in', 'logout', 'sign_out', 'password', 'verification', 'session'] },
  { key: 'user', label: 'User Management Logs', icon: '👤', keywords: ['user', 'profile', 'role', 'suspend', 'reactivate', 'account'] },
  { key: 'provider', label: 'Provider Management Logs', icon: '🧰', keywords: ['provider', 'technician', 'supplier', 'service_area', 'location'] },
  { key: 'request', label: 'Service Request Logs', icon: '📝', keywords: ['request', 'job', 'ticket', 'booking'] },
  { key: 'status', label: 'Request Status Logs', icon: '🔄', keywords: ['status', 'accepted', 'rejected', 'processing', 'completed', 'cancelled', 'reopened'] },
  { key: 'assignment', label: 'Assignment Logs', icon: '📌', keywords: ['assign', 'reassign', 'unassign', 'dispatch'] },
  { key: 'service', label: 'Service Management Logs', icon: '🛠️', keywords: ['service', 'category', 'catalog', 'offering'] },
  { key: 'payment', label: 'Payment & Subscription Logs', icon: '💳', keywords: ['payment', 'refund', 'subscription', 'invoice', 'billing', 'transaction'] },
  { key: 'security', label: 'Admin & Security Logs', icon: '🛡️', keywords: ['admin', 'security', 'permission', 'access', 'policy', 'audit'] },
  { key: 'system', label: 'System & Error Logs', icon: '⚙️', keywords: ['system', 'error', 'api', 'database', 'runtime', 'integration', 'job', 'failure', 'exception'] },
] as const;

function classifyEvent(event: AuditRow) {
  const haystack = `${event.event_type} ${event.entity_type || ''} ${JSON.stringify(event.metadata || {})}`.toLowerCase();
  return LOG_MODELS.find(model => model.keywords.some(keyword => haystack.includes(keyword))) || LOG_MODELS[9];
}

function humanize(value: string) {
  return value.replace(/[_.-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function resultLabel(event: AuditRow) {
  const severity = (event.severity || '').toLowerCase();
  if (['error', 'critical', 'fatal', 'failed', 'failure'].some(v => severity.includes(v))) return 'Failed';
  if (['warn', 'warning'].some(v => severity.includes(v))) return 'Warning';
  return 'Success';
}

function resultStyles(result: string) {
  if (result === 'Failed') return { background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' };
  if (result === 'Warning') return { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' };
  return { background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' };
}

export default function AdminAuditLogsPage() {
  const [events, setEvents] = useState<AuditRow[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoadState('loading');
    setErrorMessage('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.href = '/login';
        return;
      }
      const { data: profile } = await supabase
        .from('auth_profiles')
        .select('role')
        .eq('user_id', sessionData.session.user.id)
        .maybeSingle();

      if (profile?.role !== 'ADMIN') {
        setLoadState('forbidden');
        return;
      }

      const { data, error } = await supabase
        .from('security_events')
        .select('id,event_type,severity,entity_type,entity_id,created_at,metadata')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setEvents((data || []) as AuditRow[]);
      setLoadState('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load audit logs.');
      setLoadState('error');
    }
  }

  const modelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const model of LOG_MODELS) counts[model.key] = 0;
    for (const event of events) counts[classifyEvent(event).key] += 1;
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter(event => {
      const model = classifyEvent(event);
      const result = resultLabel(event);
      const text = `${event.event_type} ${event.entity_type || ''} ${event.entity_id || ''} ${JSON.stringify(event.metadata || {})}`.toLowerCase();
      if (term && !text.includes(term)) return false;
      if (modelFilter !== 'all' && model.key !== modelFilter) return false;
      if (resultFilter !== 'all' && result.toLowerCase() !== resultFilter) return false;
      const created = new Date(event.created_at);
      if (dateFrom && created < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && created > new Date(`${dateTo}T23:59:59.999`)) return false;
      return true;
    });
  }, [events, search, modelFilter, resultFilter, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [search, modelFilter, resultFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleEvents = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <a className="brand" href="/admin">FixIt</a>
          <p className="tagline">Admin • Audit Logs</p>
        </div>
      </header>
      <AdminNav />

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">AUDIT & SECURITY</p>
            <h2>Admin Activity Log</h2>
          </div>
          <span className="pill">{filtered.length} events</span>
        </div>

        {loadState === 'loading' && <p className="formMessage" role="status">Loading audit logs…</p>}
        {loadState === 'forbidden' && <p className="formMessage" role="alert">Administrator role required.</p>}
        {loadState === 'error' && (
          <div role="alert" style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <strong>Unable to load audit logs.</strong>
            <div style={{ marginTop: 6, fontSize: 14 }}>{errorMessage}</div>
            <button type="button" onClick={() => void load()} style={{ marginTop: 12 }}>Retry</button>
          </div>
        )}

        {loadState === 'ready' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 18 }}>
              {LOG_MODELS.map(model => (
                <button
                  key={model.key}
                  type="button"
                  onClick={() => setModelFilter(modelFilter === model.key ? 'all' : model.key)}
                  aria-pressed={modelFilter === model.key}
                  style={{
                    textAlign: 'left', padding: 14, borderRadius: 14,
                    border: modelFilter === model.key ? '2px solid #2563eb' : '1px solid #dbe4f0',
                    background: modelFilter === model.key ? '#eff6ff' : '#fff', cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 20 }}>{model.icon}</div>
                  <strong style={{ display: 'block', marginTop: 6, fontSize: 14 }}>{model.label}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>{modelCounts[model.key]} events</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 18 }}>
              <input aria-label="Search audit logs" placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)} />
              <select aria-label="Log model" value={modelFilter} onChange={e => setModelFilter(e.target.value)}>
                <option value="all">All log models</option>
                {LOG_MODELS.map(model => <option key={model.key} value={model.key}>{model.label}</option>)}
              </select>
              <select aria-label="Result" value={resultFilter} onChange={e => setResultFilter(e.target.value)}>
                <option value="all">All results</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="failed">Failed</option>
              </select>
              <input aria-label="From date" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <input aria-label="To date" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>

            <div className="jobList">
              {visibleEvents.map(event => {
                const model = classifyEvent(event);
                const result = resultLabel(event);
                const meta = event.metadata || {};
                const actor = String(meta.actor_name || meta.admin_name || meta.user_name || meta.actor_email || meta.user_email || 'System / unavailable');
                return (
                  <article className="jobCard" key={event.id} style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="jobTop">
                      <div style={{ minWidth: 0 }}>
                        <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{model.icon} {model.label}</div>
                        <strong style={{ display: 'block', marginTop: 5 }}>{humanize(event.event_type)}</strong>
                        <div className="muted">{new Date(event.created_at).toLocaleString()}</div>
                      </div>
                      <span className="pill" style={{ ...resultStyles(result), borderStyle: 'solid', borderWidth: 1 }}>{result}</span>
                    </div>

                    <div className="jobMeta" style={{ marginTop: 12 }}>
                      <span><b>Performed by:</b> {actor}</span>
                      {event.entity_type ? <span><b>Entity:</b> {humanize(event.entity_type)}</span> : null}
                      {event.entity_id ? <span><b>Reference:</b> {event.entity_id}</span> : null}
                      <span><b>Severity:</b> {humanize(event.severity || 'info')}</span>
                    </div>

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <>
                        <button type="button" onClick={() => setExpanded(expanded === event.id ? null : event.id)} style={{ marginTop: 12 }}>
                          {expanded === event.id ? 'Hide details' : 'View details'}
                        </button>
                        {expanded === event.id && (
                          <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0, fontSize: 12 }}>{JSON.stringify(event.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })}

              {!visibleEvents.length && (
                <div className="emptyQueue">
                  {events.length === 0 ? 'No audit events have been recorded yet.' : 'No audit events match the selected filters.'}
                </div>
              )}
            </div>

            {filtered.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 18 }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                <span className="muted">Page {page} of {totalPages} • 10 per page</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
