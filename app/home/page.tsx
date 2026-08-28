'use client';

import { useEffect, useState } from 'react';
import CustomerPortal from '../CustomerPortal';
import MasterCustomerHome from '../MasterCustomerHome';
import './master-customer-wizard.css';

export default function CustomerHomePage() {
  const [requestMode, setRequestMode] = useState<boolean | null>(null);

  useEffect(() => {
    setRequestMode(new URLSearchParams(window.location.search).get('new') === '1');
  }, []);

  if (requestMode === null) {
    return <div className="masterHome masterHomeLoading" aria-busy="true" aria-label="Loading customer workspace" />;
  }

  // Keep the proven Supabase-backed five-step request workflow for ?new=1,
  // but present it inside the Master Suite customer workspace.
  return requestMode ? <div className="masterCustomerWizard"><CustomerPortal /></div> : <MasterCustomerHome />;
}
