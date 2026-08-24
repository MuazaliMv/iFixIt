import type { ReactNode } from 'react';
import RequestTimelinePanel from './RequestTimelinePanel';
import './mobile-usability.css';

export default function RequestTicketLayout({children}:{children:ReactNode}){
  return <>{children}<RequestTimelinePanel/></>;
}
