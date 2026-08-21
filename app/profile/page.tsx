'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ProfileRequirementsCard from '../ProfileRequirementsCard';
import MobileNav from '../MobileNav';

type Profile={role:'CUSTOMER'|'PROVIDER'|'ADMIN';full_name?:string|null;email?:string|null;provider_approved?:boolean;created_at?:string};

export default function ProfilePage(){
 const[profile,setProfile]=useState<Profile|null>(null);const[message,setMessage]=useState('Loading profile…');
 useEffect(()=>{(async()=>{const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return;}const{data:p,error}=await supabase.from('auth_profiles').select('role,full_name,email,provider_approved,created_at').eq('user_id',data.session.user.id).maybeSingle();if(error||!p){setMessage('Unable to load your profile.');return;}setProfile(p as Profile);setMessage('Profile is up to date.');})();},[]);
 async function signOut(){await supabase.auth.signOut();window.location.href='/login';}
 return <main className="shell"><header className="topbar"><div><a className="brand" href="/">FixIt</a><p className="tagline">My Profile</p></div><div className="actions">{profile?.role==='PROVIDER'?<a className="secondary" href="/provider/onboarding">Provider Profile</a>:null}<button className="secondary" onClick={signOut}>Sign Out</button></div></header>
  <section className="panel"><div className="panelHeader"><div><p className="eyebrow">ACCOUNT</p><h2>{profile?.full_name||'Your FixIt profile'}</h2></div>{profile?<span className="pill">{profile.role}</span>:null}</div><p className="formMessage" role="status">{message}</p>{profile?<div className="adminStats"><div className="statCard"><span>Name</span><strong>{profile.full_name||'Not provided'}</strong></div><div className="statCard"><span>Email</span><strong>{profile.email||'Not provided'}</strong></div><div className="statCard"><span>Account Type</span><strong>{profile.role}</strong></div>{profile.role==='PROVIDER'?<div className="statCard"><span>Provider Approval</span><strong>{profile.provider_approved?'Approved':'Pending'}</strong></div>:null}</div>:null}</section>
  <ProfileRequirementsCard/>
  {profile?.role==='PROVIDER'?<section className="panel"><div className="panelHeader"><div><p className="eyebrow">PROVIDER PROFILE</p><h2>Marketplace setup</h2></div></div><p className="muted">Service categories, service areas, availability and provider verification are managed in your provider profile.</p><div className="actions"><a className="primary" href="/provider/onboarding">Open Provider Profile</a><a className="secondary" href="/provider">Provider Dashboard</a></div></section>:null}
  <footer className="footer"><span>FixIt Maldives</span><span>Dynamic profile requirements</span></footer>{profile?.role!=='ADMIN'?<MobileNav role={profile?.role==='PROVIDER'?'provider':'customer'}/>:null}
 </main>;
}
