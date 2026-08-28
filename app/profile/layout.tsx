import type { ReactNode } from 'react';
import './master-profile.css';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <div className="masterProfileWorkspace">{children}</div>;
}
