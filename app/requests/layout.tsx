import type { ReactNode } from 'react';
import './master-requests.css';

export default function RequestsLayout({ children }: { children: ReactNode }) {
  return <div className="masterRequestsWorkspace">{children}</div>;
}
