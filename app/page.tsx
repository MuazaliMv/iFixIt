'use client';

import { FormEvent, useEffect, useState } from 'react';

const statusItems = [
  { label: 'New', active: true },
  { label: 'Accepted', active: false },
  { label: 'Processing', active: false },
  { label: 'Completed', active: false },
];

const services = ['AC Repair', 'Plumbing', 'Electrical', 'Appliance Repair', 'Cleaning', 'Handyman'];
const SUBMIT_REQUEST_URL = 'https://yzlhlilxiszefneshatm.supabase.co/functions/v1/submit-request';

type RequestSummary = {
  id: string;
  service: string;
  location: string;
  preferredDate: string;
  description: string;
  status: 'New' | 'Accepted' | 'Processing' | 'Completed';
  createdAt: string;
};

export default function HomePage() {
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [lastRequest, setLastRequest] = useState<RequestSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('fixit:last-request');
    if (saved) {
      try {
        setLastRequest(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem('fixit:last-request');
      }
    }
  }, []);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!service) return setMessage('Please select a service.');
    if (!location.trim()) return setMessage('Please enter the service location.');
    if (!preferredDate) return setMessage('Please choose a preferred date.');
    if (description.trim().length < 10) return setMessage('Please describe the issue in at least 10 characters.');

    setSubmitting(true);
    const clientRequestId = crypto.randomUUID();

    try {
      const response = await fetch(SUBMIT_REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: service,
          location: location.trim(),
          preferredDate,
          description: description.trim(),
          clientRequestId,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.request?.ticket_number) {
        throw new Error(payload?.error || 'Unable to submit request');
      }

      const request: RequestSummary = {
        id: payload.request.ticket_number,
        service,
        location: location.trim(),
        preferredDate,
        description: description.trim(),
        status: 'New',
        createdAt: payload.request.created_at || new Date().toISOString(),
      };

      window.localStorage.setItem('fixit:last-request', JSON.stringify(request));
      setLastRequest(request);
      setMessage(`Request ${request.id} submitted successfully to FixIt.`);
      setService('');
      setLocation('');
      setPreferredDate('');
      setDescription('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">FixIt</div>
          <p className="tagline">Local help. Fixed right.</p>
        </div>
        <span className="badge">Maldives MVP</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">CUSTOMER</p>
          <h1>Request a service in a few simple steps.</h1>
          <p className="lead">Create a request, let a provider accept it, follow the work, and close it when completed.</p>
          <div className="actions">
            <a className="primary" href="#request">Request a Service</a>
            <a className="secondary" href="#workflow">View Workflow</a>
          </div>
        </div>
        <div className="statusCard" id="workflow">
          <p className="smallLabel">FROZEN MVP WORKFLOW</p>
          <div className="statusRow">
            {statusItems.map((item, index) => (
              <div className="statusStep" key={item.label}>
                <span className={item.active ? 'dot active' : 'dot'}>{index + 1}</span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
          <p className="muted">Payment processing is outside the MVP scope.</p>
        </div>
      </section>

      <section className="panel" id="request">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">SERVICE REQUEST</p>
            <h2>What do you need fixed?</h2>
          </div>
          <span className="pill">New</span>
        </div>

        <form onSubmit={submitRequest}>
          <div className="serviceGrid">
            {services.map((item) => (
              <button
                className={service === item ? 'serviceCard selected' : 'serviceCard'}
                key={item}
                type="button"
                aria-pressed={service === item}
                onClick={() => setService(item)}
              >
                <span className="serviceIcon">•</span>
                {item}
              </button>
            ))}
          </div>

          <div className="formGrid">
            <label>
              Service location
              <input placeholder="Select island / city" value={location} onChange={(event) => setLocation(event.target.value)} />
            </label>
            <label>
              Preferred date
              <input type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} />
            </label>
            <label className="full">
              Describe the issue
              <textarea placeholder="Tell the provider what needs to be fixed..." rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </div>
          <button className="primary button" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
          {message ? <p className="formMessage" role="status">{message}</p> : null}
          <p className="localNotice">Connected to the FixIt backend. New requests are stored centrally in Supabase.</p>
        </form>
      </section>

      <section className="threeCol">
        <article className="infoCard">
          <p className="eyebrow">CUSTOMER</p>
          <h3>Track your request</h3>
          {lastRequest ? (
            <div className="requestSummary">
              <strong>{lastRequest.id}</strong>
              <span className="pill">{lastRequest.status}</span>
              <p>{lastRequest.service} • {lastRequest.location}</p>
              <p>Preferred date: {lastRequest.preferredDate}</p>
            </div>
          ) : (
            <p>See the same four statuses: New, Accepted, Processing and Completed.</p>
          )}
        </article>
        <article className="infoCard">
          <p className="eyebrow">PROVIDER</p>
          <h3>Accept and complete jobs</h3>
          <p>Providers see eligible requests, accept work, start processing and mark it completed.</p>
        </article>
        <article className="infoCard">
          <p className="eyebrow">SYSTEM</p>
          <h3>Keep a clear audit trail</h3>
          <p>Status history, notifications and communication remain linked to the service request.</p>
        </article>
      </section>

      <footer className="footer">
        <span>FixIt Maldives</span>
        <span>Railway + Supabase</span>
      </footer>
    </main>
  );
}
