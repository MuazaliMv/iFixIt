'use client';

import { useEffect, useMemo, useState } from 'react';

const PROVIDER_JOBS_URL = 'https://yzlhlilxiszefneshatm.supabase.co/functions/v1/provider-jobs';

type Job = {
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

const labels: Record<Job['status'], string> = {
  NEW: 'New',
  ACCEPTED: 'Accepted',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
};

export default function ProviderPage() {
  const [accessToken, setAccessToken] = useState('');
  const [providerLabel, setProviderLabel] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyTicket, setBusyTicket] = useState('');
  const [filter, setFilter] = useState<'ALL' | Job['status']>('ALL');

  useEffect(() => {
    const saved = window.localStorage.getItem('fixit:provider-access-token');
    if (saved) setAccessToken(saved);
  }, []);

  const visibleJobs = useMemo(() => filter === 'ALL' ? jobs : jobs.filter((job) => job.status === filter), [jobs, filter]);

  async function callProvider(body: Record<string, unknown>) {
    const response = await fetch(PROVIDER_JOBS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, ...body }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || 'Provider request failed');
    return payload;
  }

  async function loadJobs() {
    if (!accessToken.trim()) return setMessage('Enter the provider access code.');
    setLoading(true);
    setMessage('');
    try {
      const payload = await callProvider({ action: 'list' });
      window.localStorage.setItem('fixit:provider-access-token', accessToken.trim());
      setProviderLabel(payload.provider?.label || 'Provider');
      setJobs(payload.requests || []);
      setMessage(`${payload.requests?.length || 0} request(s) loaded.`);
    } catch (error) {
      setJobs([]);
      setProviderLabel('');
      setMessage(error instanceof Error ? error.message : 'Unable to load jobs.');
    } finally {
      setLoading(false);
    }
  }

  async function transition(job: Job) {
    const next = job.status === 'NEW' ? 'ACCEPTED' : job.status === 'ACCEPTED' ? 'PROCESSING' : job.status === 'PROCESSING' ? 'COMPLETED' : null;
    if (!next) return;
    setBusyTicket(job.ticket_number);
    setMessage('');
    try {
      await callProvider({ action: 'transition', ticketNumber: job.ticket_number, targetStatus: next });
      await loadJobs();
      setMessage(`${job.ticket_number} moved to ${labels[next]}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update job.');
    } finally {
      setBusyTicket('');
    }
  }

  function clearAccess() {
    window.localStorage.removeItem('fixit:provider-access-token');
    setAccessToken('');
    setJobs([]);
    setProviderLabel('');
    setMessage('Provider access cleared.');
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div><a className="brand" href="/">FixIt</a><p className="tagline">Provider Operations</p></div>
        <a className="secondary" href="/">Customer Home</a>
      </header>

      <section className="panel providerLogin">
        <div className="panelHeader">
          <div><p className="eyebrow">PROVIDER</p><h2>Job Operations</h2></div>
          {providerLabel ? <span className="pill">{providerLabel}</span> : <span className="pill">Secure MVP</span>}
        </div>
        <div className="providerAccessRow">
          <input type="password" placeholder="Provider access code" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} />
          <button className="primary" type="button" onClick={loadJobs} disabled={loading}>{loading ? 'Loading…' : 'Open Job Queue'}</button>
          {providerLabel ? <button className="secondary" type="button" onClick={clearAccess}>Sign Out</button> : null}
        </div>
        {message ? <p className="formMessage" role="status">{message}</p> : null}
        <p className="localNotice">This is the temporary secure provider-access layer for MVP testing. Full phone/OTP provider authentication will replace it.</p>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div><p className="eyebrow">LIVE QUEUE</p><h2>Service Requests</h2></div>
          <button className="secondary" type="button" onClick={loadJobs} disabled={!accessToken || loading}>Refresh</button>
        </div>

        <div className="filterRow">
          {(['ALL', 'NEW', 'ACCEPTED', 'PROCESSING', 'COMPLETED'] as const).map((item) => (
            <button key={item} className={filter === item ? 'filterChip active' : 'filterChip'} onClick={() => setFilter(item)} type="button">
              {item === 'ALL' ? 'All' : labels[item]}
            </button>
          ))}
        </div>

        <div className="jobList">
          {visibleJobs.map((job) => {
            const nextLabel = job.status === 'NEW' ? 'Accept Job' : job.status === 'ACCEPTED' ? 'Start Processing' : job.status === 'PROCESSING' ? 'Mark Completed' : null;
            return (
              <article className="jobCard" key={job.ticket_number}>
                <div className="jobTop">
                  <div><strong className="ticket">{job.ticket_number}</strong><span className="muted">{job.service_name}</span></div>
                  <span className="pill">{labels[job.status]}</span>
                </div>
                <div className="jobMeta">
                  <span><b>Location:</b> {job.service_location_text}</span>
                  <span><b>Preferred:</b> {job.preferred_date}</span>
                  {job.assigned_provider_label ? <span><b>Assigned:</b> {job.assigned_provider_label}</span> : null}
                </div>
                <p className="jobDescription">{job.problem_description}</p>
                {nextLabel ? <button className="primary jobAction" type="button" disabled={busyTicket === job.ticket_number} onClick={() => transition(job)}>{busyTicket === job.ticket_number ? 'Updating…' : nextLabel}</button> : <span className="completedLabel">Job completed</span>}
              </article>
            );
          })}
          {!visibleJobs.length ? <div className="emptyQueue">No requests to show in this filter.</div> : null}
        </div>
      </section>

      <footer className="footer"><span>FixIt Maldives</span><span>Provider Operations MVP</span></footer>
    </main>
  );
}
