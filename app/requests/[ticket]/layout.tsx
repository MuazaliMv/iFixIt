import type { ReactNode } from 'react';
import RequestTimelinePanel from './RequestTimelinePanel';

export default function RequestTicketLayout({children}:{children:ReactNode}){
  return <>{children}<RequestTimelinePanel/></>;
}
