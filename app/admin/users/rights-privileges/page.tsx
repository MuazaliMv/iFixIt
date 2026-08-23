import AdminNav from '../../AdminNav';

const roles=[
 {name:'Customer',level:'Standard user access',rights:['Create service requests','View and manage own requests','Manage account and service locations','Rate completed services','Request provider access']},
 {name:'Provider',level:'Approved provider access',rights:['Receive eligible service requests','Accept and manage assigned work','Update job status','Manage provider profile and service locations','Use standard user request features']},
 {name:'Admin',level:'Full administrative access',rights:['Manage users and providers','Manage service requests','Manage platform settings','View reports and activity logs','Full operational access']},
];

export default function RightsPrivilegesPage(){
 return <main className="shell">
  <header className="topbar usersTopbar">
   <div><p className="eyebrow">ADMIN WORKSPACE · USER MANAGEMENT</p><h1 className="pageTitle">User Rights & Privileges</h1><p className="tagline">Review the effective access granted to each user role. Suspended accounts override normal role permissions.</p></div>
  </header>
  <AdminNav/>
  <section className="panel" style={{padding:18,marginBottom:18}}>
   <div className="panelHeader"><div><p className="eyebrow">ACCESS MODEL</p><h2>Role permissions</h2><p className="muted">These rights describe the current application access model. Open an individual user from the Users tab to see that account's effective privilege level and suspension state.</p></div></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
    {roles.map(role=><article key={role.name} className="jobCard" style={{padding:16}}>
     <div className="jobTop"><div><p className="eyebrow">{role.name.toUpperCase()}</p><h3 style={{margin:'3px 0 4px'}}>{role.name} Rights</h3><p className="muted" style={{margin:0}}>{role.level}</p></div></div>
     <div style={{display:'grid',gap:8,marginTop:14}}>{role.rights.map(right=><div key={right} style={{display:'flex',gap:8,alignItems:'flex-start'}}><span aria-hidden="true">✓</span><span>{right}</span></div>)}</div>
    </article>)}
   </div>
  </section>
  <section className="panel" style={{padding:18}}>
   <p className="eyebrow">ACCOUNT OVERRIDES</p><h2>Privilege rules</h2>
   <div className="detailGrid" style={{marginTop:12}}>
    <div className="detailFact"><b>Suspended customer</b><span>Cannot create new service requests.</span></div>
    <div className="detailFact"><b>Suspended provider</b><span>Does not receive new service requests.</span></div>
    <div className="detailFact"><b>Provider pending approval</b><span>Provider assignments remain disabled until approval.</span></div>
    <div className="detailFact"><b>Admin account</b><span>Protected administrative access; standard suspension/role controls are not exposed.</span></div>
   </div>
  </section>
 </main>;
}
