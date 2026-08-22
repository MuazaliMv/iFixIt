'use client';

import ProfilePage from '../../profile/page';

export default function ProviderProfilePage(){
 return <>
  <main className="shell accountApp">
   <section className="profileSection">
    <div className="profileSectionHeader">
     <div>
      <h3>Subscription</h3>
      <p className="sectionLead">Manage your provider subscription, renewal and payment history.</p>
     </div>
     <a className="secondary" href="/provider/subscription">Manage Subscription</a>
    </div>
   </section>
  </main>
  <ProfilePage/>
 </>;
}
