'use client';

import Link from 'next/link';
import styles from './recovery.module.css';

export default function NotFound(){
  return <main className={styles.page}>
    <section className={styles.card}>
      <span className={styles.eyebrow}>FIXIT MALDIVES</span>
      <h1 className={styles.title}>This page is not available</h1>
      <p className={styles.copy}>The link may be old or the page may have moved. You can return to a working part of FixIt without getting stuck.</p>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={()=>window.history.length>1?window.history.back():window.location.assign('/home')}>Go back</button>
        <Link className={styles.secondary} href="/home">Go to home</Link>
      </div>
      <div className={styles.links}>
        <Link href="/home">Request Service</Link>
        <Link href="/requests">My Requests</Link>
        <Link href="/profile">Profile</Link>
      </div>
    </section>
  </main>;
}
