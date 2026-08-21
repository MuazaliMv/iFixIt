'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Mode = 'login' | 'register';
type Role = 'CUSTOMER' | 'PROVIDER';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = '/';
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'register') {
        if (!fullName.trim()) throw new Error('Enter your name.');
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), role } },
        });
        if (error) throw error;
        setMessage('Account created. If email confirmation is enabled, confirm your email, then sign in.');
        setMode('login');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const { data: profile } = await supabase.from('auth_profiles').select('role,provider_approved').eq('user_id', data.user.id).maybeSingle();
        if (profile?.role === 'PROVIDER') window.location.href = '/provider';
        else if (profile?.role === 'ADMIN') window.location.href = '/admin';
        else window.location.href = '/';
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to continue.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell authShell">
    <header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">Secure account access</p></div><a className="secondary" href="/">Home</a></header>
    <section className="panel authCard">
      <div className="panelHeader"><div><p className="eyebrow">ACCOUNT</p><h2>{mode === 'login' ? 'Sign in to FixIt' : 'Create your FixIt account'}</h2></div><span className="pill">Supabase Auth</span></div>
      <div className="filterRow">
        <button className={mode==='login'?'filterChip active':'filterChip'} onClick={()=>setMode('login')} type="button">Sign In</button>
        <button className={mode==='register'?'filterChip active':'filterChip'} onClick={()=>setMode('register')} type="button">Register</button>
      </div>
      <form onSubmit={submit} className="authForm">
        {mode === 'register' ? <>
          <label>Full name<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" /></label>
          <label>Account type<select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="CUSTOMER">Customer</option><option value="PROVIDER">Provider</option></select></label>
        </> : null}
        <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required /></label>
        <label>Password<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required /></label>
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
      </form>
      {message ? <p className="formMessage" role="status">{message}</p> : null}
      {mode === 'register' && role === 'PROVIDER' ? <p className="localNotice">Provider accounts require Admin approval before they can accept jobs.</p> : null}
      <p className="localNotice">Administrator accounts cannot self-register. An existing signed-in account must be promoted through the secured Admin bridge.</p>
    </section>
  </main>;
}
