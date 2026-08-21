'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ProfileRequirementsCard from '../ProfileRequirementsCard';
import './account-polish.css';

const REQUIREMENTS_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/profile-requirements';
type Profile={role:'CUSTOMER'|'PROVIDER'|'ADMIN';full_name?:string|null;email?:string|null;provider_approved?:boolean;created_at?:string};
type RequirementStatus={profile_completeness:number;missing_required_field_keys:string[];can_request:boolean;completion_required:boolean;counts?:{required:number;required_completed:number;optional:number;optional_completed:number}};

export default function ProfilePage(){
 const[profile,setProfile]=useState<Profile|null>(null);const[status,setStatus]=useState<RequirementStatus|null>(null);const[message,setMessage]=useState('Loading profile…');
 useEffect(()=>{void load();},[]);
 async function load(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return;}const[{data:p,error},r]=await Promise.all([supabase.from('auth_profiles').select('role,full_name,email,provider_approved,created_at').eq('user_id',data.session.user.id).maybeSingle(),fetch(REQUIREMENTS_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`},body:JSON.stringify({action:'status'})}).catch(()=>null)]);if(error||!p){setMessage('Unable to load your profile.');return;}setProfile(p as Profile);if(r?.ok){const payload=await r.json();setStatus(payload as RequirementStatus);}setMessage('Profile is up to date.');}
 async function signOut(){await supabase.auth.signOut();window.location.href='/login';}
 const completeness=Math.max(0,Math.min(100,status?.profile_completeness??0));
 const initial=(profile?.full_name||profile?.email||'U').slice(0,1).toUpperCase();
 return <main className="shell accountApp">
  <header className="accountHeader"><div className="accountTitle"><a className="accountBack" href="/">‹</a><div><h1>Profile</h1><p>Account, verification and preferences</p></div></div><button className="accountIconButton" type="button" onClick={()=>void load()} aria-label="Refresh profile">↻</button></header>

  <section className="profileHeroCard"><div className="profileIdentity"><div className="profileAvatar">{initial}</div><div><h2>{profile?.full_name||'Your FixIt profile'}</h2><p>{profile?.email||'Email not provided'}</p><div className="profileBadges">{profile?<span className="profileBadge">{profile.role}</span>:null}{profile?.role==='PROVIDER'?<span className={profile.provider_approved?'profileBadge verified':'profileBadge'}>{profile.provider_approved?'✓ Verified Provider':'Approval Pending'}</span>:null}</div></div></div></section>

  {profile?.role!=='ADMIN'?<section className="profileSection"><div className="completionBarWrap"><div className="completionTop"><div><h3>Profile completion</h3><p className="sectionLead">Complete your profile so customers and providers have the information they need.</p></div><strong>{completeness}%</strong></div><div className="completionTrack"><div className="completionFill" style={{width:`${completeness}%`}}/></div><div className="profileDetailRow"><span>Required fields</span><strong>{status?.counts?`${status.counts.required_completed}/${status.counts.required}`:'Checking…'}</strong></div><div className="profileDetailRow"><span>Missing required</span><strong>{status?.missing_required_field_keys?.length||0}</strong></div><div className="profileDetailRow"><span>Request eligibility</span><strong>{status?.can_request===false?'Action required':'Ready'}</strong></div></div></section>:null}

  <section className="profileSection"><h3>Account details</h3><p className="sectionLead">Your core FixIt account information.</p><div className="profileDetailList"><div className="profileDetailRow"><span>Name</span><strong>{profile?.full_name||'Not provided'}</strong></div><div className="profileDetailRow"><span>Email</span><strong>{profile?.email||'Not provided'}</strong></div><div className="profileDetailRow"><span>Account type</span><strong>{profile?.role||'Loading…'}</strong></div>{profile?.created_at?<div className="profileDetailRow"><span>Member since</span><strong>{new Date(profile.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong></div>:null}{profile?.role==='PROVIDER'?<div className="profileDetailRow"><span>Provider approval</span><strong>{profile.provider_approved?'Approved':'Pending review'}</strong></div>:null}</div></section>

  {profile?.role!=='ADMIN'?<ProfileRequirementsCard/>:null}

  <section className="profileSection"><h3>Quick access</h3><p className="sectionLead">Manage the areas connected to your account.</p><div className="profileQuickGrid">{profile?.role==='PROVIDER'?<><a className="profileQuickCard" href="/provider/onboarding"><span className="profileQuickIcon">⚙</span><span><strong>Provider Setup</strong><small>Services, areas and availability</small></span></a><a className="profileQuickCard" href="/provider"><span className="profileQuickIcon">▣</span><span><strong>Provider Dashboard</strong><small>Requests and active work</small></span></a><a className="profileQuickCard" href="/provider/earnings"><span className="profileQuickIcon">MVR</span><span><strong>Job Values</strong><small>Completed work values</small></span></a></>:<><a className="profileQuickCard" href="/requests"><span className="profileQuickIcon">▣</span><span><strong>My Requests</strong><small>Active and completed requests</small></span></a><a className="profileQuickCard" href="/messages"><span className="profileQuickIcon">✉</span><span><strong>Messages</strong><small>Provider conversations</small></span></a><a className="profileQuickCard" href="/#request"><span className="profileQuickIcon">＋</span><span><strong>New Request</strong><small>Request another service</small></span></a></>}</div></section>

  <button className="profileSignOut" type="button" onClick={signOut}>Sign Out</button>
  <p className="muted" style={{textAlign:'center',fontSize:12}}>{message}</p>
 </main>;
}
