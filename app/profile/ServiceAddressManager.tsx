'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import './service-address-manager.css';

type Atoll={id:string;display_name:string};
type Island={id:string;atoll_id:string;display_name:string};
type ServiceAddress={id:string;user_id:string;label:string;address_line1:string;address_line2?:string|null;city?:string|null;ward?:string|null;state_region?:string|null;postal_code?:string|null;country?:string|null;service_atoll_id?:string|null;service_island_id?:string|null;access_instructions?:string|null;is_default:boolean;is_active:boolean;updated_at?:string|null};

export default function ServiceAddressManager(){
 const[addresses,setAddresses]=useState<ServiceAddress[]>([]);const[atolls,setAtolls]=useState<Atoll[]>([]);const[islands,setIslands]=useState<Island[]>([]);
 const[loading,setLoading]=useState(true);const[busy,setBusy]=useState(false);const[editingId,setEditingId]=useState<string|null>(null);const[showForm,setShowForm]=useState(false);const[message,setMessage]=useState('');
 const[label,setLabel]=useState('Home');const[house,setHouse]=useState('');const[road,setRoad]=useState('');const[atollId,setAtollId]=useState('');const[islandId,setIslandId]=useState('');const[ward,setWard]=useState('');const[accessInstructions,setAccessInstructions]=useState('');
 const filteredIslands=useMemo(()=>islands.filter(i=>i.atoll_id===atollId),[islands,atollId]);
 const selectedAtoll=atolls.find(a=>a.id===atollId)||null;const selectedIsland=islands.find(i=>i.id===islandId&&i.atoll_id===atollId)||null;

 useEffect(()=>{void load();},[]);

 async function api(method:'GET'|'POST'|'PATCH'|'DELETE',body?:Record<string,unknown>){
  const response=await fetch('/api/user/service-addresses',{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const payload=await response.json().catch(()=>({}));if(response.status===401){window.location.replace('/login?next=%2Fprofile');throw new Error('Authentication required.');}if(!response.ok)throw new Error(payload?.error||'Unable to update Service Address.');return payload;
 }
 async function loadLocations(){
  const response=await fetch('/api/locations/catalogue',{credentials:'same-origin',cache:'no-store'});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||'Unable to load Maldives locations.');
  setAtolls((payload.atolls||[]).map((x:any)=>({id:String(x.id),display_name:String(x.display_name||x.official_name||'')})).filter((x:Atoll)=>x.id&&x.display_name));
  setIslands((payload.islands||[]).map((x:any)=>({id:String(x.id),atoll_id:String(x.atoll_id),display_name:String(x.display_name||x.canonical_name||'')})).filter((x:Island)=>x.id&&x.atoll_id&&x.display_name));
 }
 async function loadAddresses(){const payload=await api('GET');setAddresses((payload.addresses||[]) as ServiceAddress[]);}
 async function load(){setLoading(true);try{await Promise.all([loadLocations(),loadAddresses()]);setMessage('');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load Service Addresses.');}finally{setLoading(false);}}

 function resetForm(){setEditingId(null);setLabel('Home');setHouse('');setRoad('');setAtollId('');setIslandId('');setWard('');setAccessInstructions('');}
 function startAdd(){resetForm();setShowForm(true);setMessage('');}
 function startEdit(a:ServiceAddress){setEditingId(a.id);setLabel(a.label);setHouse(a.address_line1);setRoad(a.address_line2||'');setAtollId(a.service_atoll_id||'');setIslandId(a.service_island_id||'');setWard(a.ward||'');setAccessInstructions(a.access_instructions||'');setShowForm(true);setMessage('');}
 function validate(){if(label.trim().length<2||label.trim().length>40)return'Name must be between 2 and 40 characters.';if(!selectedAtoll)return'Select an Atoll / Region.';if(!selectedIsland)return'Select an Island / City from the selected Atoll / Region.';if(ward.trim().length>120)return'Ward / Locality must be 120 characters or fewer.';if(road.trim().length<2||road.trim().length>120)return'Enter a valid Road / Street.';if(house.trim().length<2||house.trim().length>120)return'Enter a valid House / Apartment.';if(accessInstructions.trim().length>240)return'Access instructions must be 240 characters or fewer.';return'';}
 function body(){return{label:label.trim(),address_line1:house.trim(),address_line2:road.trim(),city:selectedIsland?.display_name||'',ward:ward.trim()||null,state_region:selectedAtoll?.display_name||'',postal_code:null,country:'Maldives',service_atoll_id:selectedAtoll?.id||null,service_island_id:selectedIsland?.id||null,access_instructions:accessInstructions.trim()||null};}

 async function makeDefault(a:ServiceAddress){if(busy||a.is_default)return;setBusy(true);setMessage('Updating default Service Address…');try{await api('PATCH',{id:a.id,action:'set_default'});await loadAddresses();window.dispatchEvent(new Event('fixit:profile-updated'));setMessage('Default Service Address updated.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to update default Service Address.');}finally{setBusy(false);}}
 async function save(event:FormEvent){event.preventDefault();if(busy)return;const validation=validate();if(validation){setMessage(validation);return;}setBusy(true);setMessage(editingId?'Updating Service Address…':'Saving Service Address…');try{if(editingId)await api('PATCH',{id:editingId,...body()});else await api('POST',body());resetForm();setShowForm(false);await loadAddresses();window.dispatchEvent(new Event('fixit:profile-updated'));setMessage('Service Address saved.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to save Service Address.');}finally{setBusy(false);}}
 async function remove(a:ServiceAddress){if(busy)return;if(!window.confirm(`Delete ${a.label}?${a.is_default?' The next saved address will automatically become your default.':''}`))return;setBusy(true);setMessage('Deleting Service Address…');try{await api('DELETE',{id:a.id});await loadAddresses();window.dispatchEvent(new Event('fixit:profile-updated'));setMessage(a.is_default?'Service Address deleted. The next saved address is now the default.':'Service Address deleted.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to delete Service Address.');}finally{setBusy(false);}}

 function addressLine(a:ServiceAddress){return[a.state_region,a.city,a.ward,a.address_line2,a.address_line1].filter(Boolean).join(' · ');}

 return <section className="serviceAddressManager" id="manage-service-addresses" aria-labelledby="service-address-manager-title">
  <div className="serviceAddressManagerHead"><div><small>SERVICE ADDRESSES</small><h2 id="service-address-manager-title">Manage service addresses</h2><p>Choose a default address for your profile, or keep additional addresses for future service requests.</p></div>{!showForm?<button type="button" className="samPrimary" onClick={startAdd} disabled={loading||busy}>+ Add Address</button>:null}</div>
  {loading?<p className="samStatus">Loading Service Addresses…</p>:null}
  {!loading&&!addresses.length&&!showForm?<div className="samEmpty"><strong>No Service Address saved</strong><span>Add your first address. It will automatically become your default.</span></div>:null}
  {!loading&&addresses.length?<div className="samList">{addresses.map(a=><article className={`samAddress${a.is_default?' isDefault':''}`} key={a.id}><div className="samAddressTop"><div><strong>{a.label}</strong>{a.is_default?<span className="samDefaultBadge">Default</span>:null}</div><p>{addressLine(a)}</p></div><div className="samActions">{!a.is_default?<button type="button" onClick={()=>void makeDefault(a)} disabled={busy}>Make Default</button>:null}<button type="button" onClick={()=>startEdit(a)} disabled={busy}>Edit</button><button type="button" className="danger" onClick={()=>void remove(a)} disabled={busy}>Delete</button></div></article>)}</div>:null}
  {showForm?<form className="samForm" onSubmit={save} noValidate><div className="samFormTitle"><strong>{editingId?'Edit Service Address':'Add Service Address'}</strong><button type="button" onClick={()=>{resetForm();setShowForm(false);setMessage('');}} disabled={busy}>Cancel</button></div><div className="samGrid">
   <label>Name<input value={label} onChange={e=>setLabel(e.target.value)} maxLength={40} placeholder="Home, Office, Apartment" disabled={busy} required/></label>
   <label>Atoll / Region<select value={atollId} onChange={e=>{setAtollId(e.target.value);setIslandId('');setWard('');}} disabled={busy} required><option value="">Select Atoll / Region</option>{atolls.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select></label>
   <label>Island / City<select value={islandId} onChange={e=>{setIslandId(e.target.value);setWard('');}} disabled={busy||!atollId} required><option value="">{atollId?'Select Island / City':'Select Atoll / Region first'}</option>{filteredIslands.map(i=><option key={i.id} value={i.id}>{i.display_name}</option>)}</select></label>
   <label>Ward / Locality <span>optional</span><input value={ward} onChange={e=>setWard(e.target.value.slice(0,120))} maxLength={120} placeholder="Ward or locality" disabled={busy||!islandId}/></label>
   <label>Road / Street<input value={road} onChange={e=>setRoad(e.target.value)} maxLength={120} autoComplete="address-line2" disabled={busy} required/></label>
   <label>House / Apartment<input value={house} onChange={e=>setHouse(e.target.value)} maxLength={120} autoComplete="address-line1" disabled={busy} required/></label>
   <label className="samWide">Access instructions <span>optional</span><textarea value={accessInstructions} onChange={e=>setAccessInstructions(e.target.value.slice(0,240))} maxLength={240} disabled={busy}/><small>{accessInstructions.length}/240</small></label>
  </div><button type="submit" className="samPrimary samSave" disabled={busy}>{busy?'Saving…':editingId?'Update Address':'Save Address'}</button></form>:null}
  {message?<p className="samStatus" role="status" aria-live="polite">{message}</p>:null}
 </section>;
}
