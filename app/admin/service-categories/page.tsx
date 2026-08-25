'use client';

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminNav from '../AdminNav';

const CATEGORIES_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/admin-service-categories';

type Category={
 id:string;code:string;name:string;description:string|null;parent_id:string|null;is_active:boolean;created_at:string;updated_at:string;
};
type FormState={id:string|null;parentId:string|null;name:string;description:string;isActive:boolean};
const blank:FormState={id:null,parentId:null,name:'',description:'',isActive:true};

function dateLabel(value:string){
 const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
}

export default function ServiceCategoriesPage(){
 const[categories,setCategories]=useState<Category[]>([]);
 const[loading,setLoading]=useState(true);
 const[saving,setSaving]=useState(false);
 const[message,setMessage]=useState('');
 const[form,setForm]=useState<FormState>(blank);
 const[open,setOpen]=useState(false);
 const[query,setQuery]=useState('');

 useEffect(()=>{void load();},[]);
 const topLevel=useMemo(()=>categories.filter(c=>!c.parent_id),[categories]);
 const childrenByParent=useMemo(()=>{const map=new Map<string,Category[]>();for(const category of categories){if(!category.parent_id)continue;const list=map.get(category.parent_id)||[];list.push(category);map.set(category.parent_id,list);}return map;},[categories]);
 const filtered=useMemo(()=>{
  const q=query.trim().toLowerCase();
  if(!q)return topLevel;
  return topLevel.filter(category=>{
   const own=`${category.name} ${category.description||''} ${category.code}`.toLowerCase();
   const children=childrenByParent.get(category.id)||[];
   return own.includes(q)||children.some(child=>`${child.name} ${child.description||''} ${child.code}`.toLowerCase().includes(q));
  });
 },[topLevel,childrenByParent,query]);

 async function call(body:Record<string,unknown>){
  const{data}=await supabase.auth.getSession();const token=data.session?.access_token;
  if(!token){window.location.href='/login';throw new Error('Authentication required.');}
  const response=await fetch(CATEGORIES_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error||'Unable to manage service categories.');
  return payload;
 }
 async function load(){setLoading(true);try{const payload=await call({action:'list'});setCategories(payload.categories||[]);setMessage('');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load categories.');}finally{setLoading(false);}}
 function beginCreate(){setForm(blank);setOpen(true);setMessage('');}
 function beginSubcategory(category:Category){setForm({...blank,parentId:category.id});setOpen(true);setMessage('');}
 function beginEdit(category:Category){setForm({id:category.id,parentId:category.parent_id,name:category.name,description:category.description||'',isActive:category.is_active});setOpen(true);setMessage('');}
 function stop(event:MouseEvent){event.stopPropagation();}
 async function save(event:FormEvent){event.preventDefault();if(!form.name.trim()){setMessage(form.parentId?'Subcategory name is required.':'Category name is required.');return;}setSaving(true);try{const subcategory=Boolean(form.parentId);await call({action:form.id?'update':'create',id:form.id,parentId:form.parentId,name:form.name,description:form.description,isActive:form.isActive});setOpen(false);setForm(blank);await load();setMessage(form.id?(subcategory?'Subcategory updated.':'Service category updated.'):(subcategory?'Subcategory created.':'Service category created.'));}catch(error){setMessage(error instanceof Error?error.message:'Unable to save category.');}finally{setSaving(false);}}
 async function remove(category:Category){if(!window.confirm(`Delete “${category.name}”? This cannot be undone.`))return;setSaving(true);try{await call({action:'delete',id:category.id});await load();setMessage(category.parent_id?'Subcategory deleted.':'Service category deleted.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to delete category.');}finally{setSaving(false);}}
 const parentCategory=form.parentId?categories.find(c=>c.id===form.parentId):null;

 return <>
  <AdminNav/>
  <main className="categoryAdminPage">
   <section className="categoryAdminHead">
    <div><span className="eyebrow">MANAGEMENT & OPERATIONS</span><h1>Service Categories</h1><p>Tap or click a main category to add a subcategory under it.</p></div>
    <button type="button" className="primaryAction" onClick={beginCreate}>+ Add Category</button>
   </section>

   <section className="categoryToolbar">
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search categories" aria-label="Search service categories"/>
    <span>{filtered.length} {filtered.length===1?'category':'categories'}</span>
   </section>

   {message?<div className="categoryMessage" role="status">{message}</div>:null}
   {loading?<div className="categoryEmpty">Loading service categories…</div>:filtered.length===0?<div className="categoryEmpty">No service categories found.</div>:
   <div className="categoryTableWrap"><table className="categoryTable"><thead><tr><th>Category Name</th><th>Description</th><th>Status</th><th>Created Date</th><th>Actions</th></tr></thead><tbody>{filtered.map(category=>{
    const children=childrenByParent.get(category.id)||[];
    return <FragmentRows key={category.id} category={category} children={children} query={query} saving={saving} beginSubcategory={beginSubcategory} beginEdit={beginEdit} remove={remove} stop={stop}/>;
   })}</tbody></table></div>}
  </main>

  {open?<div className="categoryModalBackdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setOpen(false);}}><form className="categoryModal" onSubmit={save}><div className="categoryModalHead"><div><span className="eyebrow">SERVICE CATEGORIES</span><h2>{form.id?(form.parentId?'Edit Subcategory':'Edit Category'):(form.parentId?'Add Subcategory':'Add Category')}</h2>{parentCategory&&!form.id?<p className="parentHint">Under <strong>{parentCategory.name}</strong></p>:null}</div><button type="button" aria-label="Close" onClick={()=>setOpen(false)} disabled={saving}>×</button></div><label>{form.parentId?'Subcategory Name':'Category Name'}<input required maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={form.parentId?'e.g. AC Installation':'e.g. Air Conditioning'}/></label><label>Description<textarea maxLength={1200} rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Optional description"/></label><label className="toggleRow"><span><strong>Status</strong><small>{form.isActive?'Active and available across the system':'Inactive and hidden from new selections'}</small></span><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/></label><div className="categoryModalActions"><button type="button" onClick={()=>setOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="primaryAction" disabled={saving}>{saving?'Saving…':form.id?'Save Changes':form.parentId?'Create Subcategory':'Create Category'}</button></div></form></div>:null}

  <style jsx global>{`
   .categoryAdminPage{max-width:1180px;margin:0 auto;padding:28px 22px 90px;color:#0f172a}.categoryAdminHead{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:20px}.eyebrow{display:block;color:#2563eb;font-size:11px;font-weight:900;letter-spacing:.11em}.categoryAdminHead h1,.categoryModal h2{margin:6px 0 5px;font-size:clamp(28px,5vw,42px);letter-spacing:-.04em}.categoryAdminHead p{margin:0;color:#64748b;max-width:620px}.primaryAction{border:0;border-radius:12px;background:#2563eb;color:#fff;padding:11px 16px;font-weight:850;cursor:pointer;white-space:nowrap}.primaryAction:disabled{opacity:.55;cursor:not-allowed}.categoryToolbar{display:flex;align-items:center;gap:12px;margin-bottom:14px}.categoryToolbar input{flex:1;min-height:44px;border:1px solid #dbe2ea;border-radius:12px;padding:0 14px;background:#fff;font:inherit}.categoryToolbar span{color:#64748b;font-size:13px;font-weight:800}.categoryMessage{margin:0 0 14px;padding:12px 14px;border:1px solid #dbeafe;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-weight:750}.categoryEmpty{padding:42px 18px;text-align:center;border:1px dashed #cbd5e1;border-radius:16px;color:#64748b;background:#fff}.categoryTableWrap{overflow:auto;border:1px solid #e2e8f0;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.05)}.categoryTable{width:100%;border-collapse:collapse;min-width:760px}.categoryTable th{padding:13px 16px;text-align:left;background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.07em}.categoryTable td{padding:15px 16px;border-top:1px solid #eef2f7;vertical-align:middle}.categoryRow{cursor:pointer}.categoryRow:hover{background:#f8fbff}.categoryTable td:first-child strong,.categoryTable td:first-child small{display:block}.categoryTable td:first-child small{margin-top:3px;color:#94a3b8}.categoryTapHint{display:inline-block!important;margin-top:6px!important;color:#2563eb!important;font-weight:800}.subcategoryRow{background:#fbfdff}.subcategoryRow td:first-child{padding-left:38px}.subcategoryRow td:first-child strong:before{content:'↳ ';color:#94a3b8}.subcategoryBadge{display:inline-flex!important;width:max-content;margin-top:5px!important;padding:2px 7px;border-radius:999px;background:#eef2ff;color:#4f46e5!important;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.statusPill{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:850}.statusPill.active{background:#ecfdf5;color:#15803d}.statusPill.inactive{background:#f1f5f9;color:#64748b}.rowActions{display:flex;gap:7px}.rowActions button{border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:7px 10px;font-weight:800;cursor:pointer}.rowActions .deleteAction{border-color:#fecaca;color:#dc2626;background:#fff7f7}.categoryModalBackdrop{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.38);backdrop-filter:blur(5px)}.categoryModal{width:min(100%,520px);display:grid;gap:16px;padding:20px;border-radius:20px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.28)}.categoryModalHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.categoryModal h2{font-size:28px}.categoryModalHead>button{width:38px;height:38px;border:0;border-radius:10px;background:#f1f5f9;color:#64748b;font-size:26px}.parentHint{margin:5px 0 0;color:#64748b;font-size:13px}.categoryModal label{display:grid;gap:7px;color:#334155;font-size:13px;font-weight:850}.categoryModal input[type=text],.categoryModal input:not([type]),.categoryModal textarea{width:100%;border:1px solid #cbd5e1;border-radius:11px;padding:11px 12px;font:inherit;resize:vertical}.toggleRow{grid-template-columns:1fr auto!important;align-items:center;padding:13px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.toggleRow small{display:block;margin-top:3px;color:#64748b;font-weight:600}.toggleRow input{width:22px;height:22px}.categoryModalActions{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}.categoryModalActions>button:not(.primaryAction){border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:10px 14px;font-weight:800}
   @media(max-width:700px){.categoryAdminPage{padding:20px 14px 90px}.categoryAdminHead{align-items:stretch;flex-direction:column}.categoryAdminHead .primaryAction{width:100%;min-height:46px}.categoryToolbar{align-items:stretch;flex-direction:column}.categoryToolbar span{padding-left:2px}.categoryTableWrap{overflow:visible;border:0;background:transparent;box-shadow:none}.categoryTable,.categoryTable tbody,.categoryTable tr,.categoryTable td{display:block;min-width:0}.categoryTable thead{display:none}.categoryTable tr{margin-bottom:12px;padding:14px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.05)}.categoryTable td{display:grid;grid-template-columns:115px 1fr;gap:8px;padding:8px 0;border:0}.categoryTable td:before{color:#94a3b8;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.categoryTable td:nth-child(1):before{content:'Category'}.categoryTable td:nth-child(2):before{content:'Description'}.categoryTable td:nth-child(3):before{content:'Status'}.categoryTable td:nth-child(4):before{content:'Created'}.categoryTable td:nth-child(5):before{content:'Actions'}.subcategoryRow{margin-left:18px;border-left:4px solid #dbeafe!important}.subcategoryRow td:first-child{padding-left:0}.rowActions{justify-content:flex-start}.categoryModal{max-height:calc(100dvh - 32px);overflow:auto}.categoryModalActions{display:grid;grid-template-columns:1fr 1fr}.categoryModalActions button{min-height:44px}}
  `}</style>
 </>;
}

type FragmentRowsProps={category:Category;children:Category[];query:string;saving:boolean;beginSubcategory:(category:Category)=>void;beginEdit:(category:Category)=>void;remove:(category:Category)=>Promise<void>;stop:(event:MouseEvent)=>void};
function FragmentRows({category,children,query,saving,beginSubcategory,beginEdit,remove,stop}:FragmentRowsProps){
 const q=query.trim().toLowerCase();
 const visibleChildren=q?children.filter(child=>`${child.name} ${child.description||''} ${child.code}`.toLowerCase().includes(q)||`${category.name} ${category.description||''} ${category.code}`.toLowerCase().includes(q)):children;
 return <>
  <tr className="categoryRow" onClick={()=>beginSubcategory(category)} title={`Add subcategory under ${category.name}`}>
   <td><strong>{category.name}</strong><small>{category.code}</small><small className="categoryTapHint">+ Click to add subcategory</small></td><td>{category.description||'—'}</td><td><span className={`statusPill ${category.is_active?'active':'inactive'}`}>{category.is_active?'Active':'Inactive'}</span></td><td>{dateLabel(category.created_at)}</td><td><div className="rowActions" onClick={stop}><button type="button" onClick={()=>beginEdit(category)}>Edit</button><button type="button" className="deleteAction" disabled={saving} onClick={()=>void remove(category)}>Delete</button></div></td>
  </tr>
  {visibleChildren.map(child=><tr className="subcategoryRow" key={child.id}><td><strong>{child.name}</strong><small>{child.code}</small><small className="subcategoryBadge">Subcategory</small></td><td>{child.description||'—'}</td><td><span className={`statusPill ${child.is_active?'active':'inactive'}`}>{child.is_active?'Active':'Inactive'}</span></td><td>{dateLabel(child.created_at)}</td><td><div className="rowActions"><button type="button" onClick={()=>beginEdit(child)}>Edit</button><button type="button" className="deleteAction" disabled={saving} onClick={()=>void remove(child)}>Delete</button></div></td></tr>)}
 </>;
}
