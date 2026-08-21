'use client';

import { useMemo, useState } from 'react';

const ADMIN_URL = 'https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-operations';

type RequestRow = {
  ticket_number: string;
  service_name: string;
  service_location_text: string;
  preferred_date: string;
  problem_description: string;
  status: 'NEW' | 'ACCEPTED' | 'PROCESSING' | 'COMPLETED';
  assigned_provider_label?: string | null;
  created_at: string;
  updated_at: string;
};

type Counts = { total: number; new: number; accepted: number; processing: number; completed: number };

const labels: Record<RequestRow['status'], string> = {
  NEW: 'New', ACCEPTED: 'Accepted', PROCESSING: 'Processing', COMPLETED: 'Completed',
};

export default function AdminPage() {
  const [accessToken, setAccessToken] = useState('');
  const [adminLabel, setAdminLabel] = useState('');
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, new: 0, accepted: 0, processing: 0, completed: 0 });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | RequestRow['status']>('ALL');

  const visible = useMemo(() => filter === 'ALL' ? requests : requests.filter(r => r.status === filter), [filter, requests]);

  async function loadDashboard() {
    if (!accessToken.trim()) return setMessage('Enter the admin access code.');
    setLoading(true); setMessage('');
    try {
      const response = await fetch(ADMIN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: accessToken.trim(), action: 'dashboard' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load admin dashboard');
      setAdminLabel(payload.admin?.label || 'Admin');
      setCounts(payload.counts || counts);
      setRequests(payload.requests || []);
      window.localStorage.setItem('fixit:admin-access-token', accessToken.trim());
      setMessage('Admin dashboard refreshed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load dashboard.');
    } finally { setLoading(false); }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div><a className="brand" href="/">FixIt</a><p className="tagline">Admin Operations</p></div>
        <div className="actions"><a className="secondary" href="/provider">Provider</a><a className="secondary" href="/">Customer</a></div>
      </header>

      <section className="panel">
        <div className="panelHeader">
          <div><p className="eyebrow">ADMIN</p><h2>Operations Dashboard</h2></div>
          <span className="pill">{adminLabel || 'Secure MVP'}</span>
        </div>
        <div className="providerAccessRow">
          <input type="password" placeholder="Admin access code" value={accessToken} onChange={e => setAccessToken(e.target.value)} />
          <button className="primary" type="button" disabled={loading} onClick={loadDashboard}>{loading ? 'Loading…' : 'Open Dashboard'}</button>
        </div>
        {message ? <p className="formMessage" role="status">{message}</p> : null}
        <p className="localNotice">Temporary MVP admin access. Full authenticated RBAC remains the next security upgrade.</p>
      </section>

      <section className="adminStats">
        <article className="statCard"><span>Total</span><strong>{counts.total}</strong></article>
        <article className="statCard"><span>New</span><strong>{counts.new}</strong></article>
        <article className="statCard"><span>Accepted</span><strong>{counts.accepted}</strong></article>
        <article className="statCard"><span>Processing</span><strong>{counts.processing}</strong></article>
        <article className="statCard"><span>Completed</span><strong>{counts.completed}</strong></article>
      </section>

      <section className="panel">
        <div className="panelHeader"><div><p className="eyebrow">REQUEST OVERSIGHT</p><h2>All Service Requests</h2></div><button className="secondary" onClick={loadDashboard} disabled={!accessToken || loading}>Refresh</button></div>
        <div className="filterRow">
          {(['ALL','NEW','ACCEPTED','PROCESSING','COMPLETED'] as const).map(item => <button key={item} className={filter===item?'filterChip active':'filterChip'} onClick={()=>setFilter(item)}>{item==='ALL'?'All':labels[item]}</button>)}
        </div>
        <div className="jobList">
          {visible.map(r => (
            <article className="jobCard" key={r.ticket_number}>
              <div className="jobTop"><div><strong className="ticket">{r.ticket_number}</strong><span className="muted">{r.service_name}</span></div><span className="pill">{labels[r.status]}</span></div>
              <div className="jobMeta"><span><b>Location:</b> {r.service_location_text}</span><span><b>Preferred:</b> {r.preferred_date}</span>{r.assigned_provider_label?<span><b>Provider:</b> {r.assigned_provider_label}</span>:null}</div>
              <p className="jobDescription">{r.problem_description}</p>
            </article>
          ))}
          {!visible.length ? <div className="emptyQueue">No requests to show.</div> : null}
        </div>
      </section>

      <footer className="footer"><span>FixIt Maldives</span><span>Admin Operations MVP</span></footer>
    </main>
  );
}
