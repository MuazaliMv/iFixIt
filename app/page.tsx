const statusItems = [
  { label: 'New', active: true },
  { label: 'Accepted', active: false },
  { label: 'Processing', active: false },
  { label: 'Completed', active: false },
];

const services = ['AC Repair', 'Plumbing', 'Electrical', 'Appliance Repair', 'Cleaning', 'Handyman'];

export default function HomePage() {
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
          <p className="lead">
            Create a request, let a provider accept it, follow the work, and close it when completed.
          </p>
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

        <div className="serviceGrid">
          {services.map((service) => (
            <button className="serviceCard" key={service} type="button">
              <span className="serviceIcon">•</span>
              {service}
            </button>
          ))}
        </div>

        <div className="formGrid">
          <label>
            Service location
            <input placeholder="Select island / city" />
          </label>
          <label>
            Preferred date
            <input type="date" />
          </label>
          <label className="full">
            Describe the issue
            <textarea placeholder="Tell the provider what needs to be fixed..." rows={4} />
          </label>
        </div>
        <button className="primary button" type="button">Submit Request</button>
      </section>

      <section className="threeCol">
        <article className="infoCard">
          <p className="eyebrow">CUSTOMER</p>
          <h3>Track your request</h3>
          <p>See the same four statuses: New, Accepted, Processing and Completed.</p>
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
        <span>Deployment baseline • Next.js</span>
      </footer>
    </main>
  );
}
