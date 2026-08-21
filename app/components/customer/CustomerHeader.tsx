'use client';

import type { ReactNode } from 'react';
type Props={title?:string;backHref?:string;right?:ReactNode};
export default function CustomerHeader({title,backHref,right}:Props){return <header className="c3Header"><div className="c3HeaderSide">{backHref?<a className="c3IconButton" href={backHref} aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>:<span/>}</div><a className="c3Logo" href="/" aria-label="iFixIt home"><span>iFix</span><b>It</b>{title?<small>{title}</small>:null}</a><div className="c3HeaderSide c3HeaderRight">{right}</div></header>}
