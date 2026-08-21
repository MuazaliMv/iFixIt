import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, authorization, apikey, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const enc=new TextEncoder();
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors}); if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); if(!jwt)return json({error:"Sign in required"},401);
  const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const {data:{user},error:userError}=await sb.auth.getUser(jwt); if(userError||!user)return json({error:"Invalid session"},401);
  const body=await req.json(); const action=String(body.action??"dashboard").toLowerCase();
  const {data:profile}=await sb.from("auth_profiles").select("role,full_name,email").eq("user_id",user.id).maybeSingle(); if(!profile)return json({error:"Account profile not found"},403);
  if(action==="bootstrap_admin"){
   const legacy=String(body.accessToken??"").trim(); if(legacy.length<20)return json({error:"Legacy admin code required"},401);
   const {data:a}=await sb.from("admin_access_tokens").select("id").eq("token_hash",await hash(legacy)).eq("is_active",true).maybeSingle(); if(!a)return json({error:"Legacy admin code denied"},401);
   const {error}=await sb.from("auth_profiles").update({role:"ADMIN",provider_approved:false}).eq("user_id",user.id); if(error)throw error; return json({ok:true,role:"ADMIN"});
  }
  if(profile.role!=="ADMIN")return json({error:"Administrator role required"},403); const adminLabel=profile.full_name||profile.email||"Admin";
  if(action==="dashboard"){
   const {data:reqs,error}=await sb.from("request_intake").select("ticket_number,service_name,service_location_text,preferred_date,problem_description,status,assigned_provider_label,created_at,updated_at").order("created_at",{ascending:false}).limit(300); if(error)throw error;
   const requests=reqs??[]; const counts={total:requests.length,new:0,accepted:0,processing:0,completed:0}; for(const r of requests){if(r.status==="NEW")counts.new++;else if(r.status==="ACCEPTED")counts.accepted++;else if(r.status==="PROCESSING")counts.processing++;else if(r.status==="COMPLETED")counts.completed++;}
   const {data:providers}=await sb.from("auth_profiles").select("user_id,email,full_name,provider_approved,created_at").eq("role","PROVIDER").order("created_at",{ascending:false});
   const {data:users}=await sb.from("auth_profiles").select("user_id,email,full_name,role,provider_approved,created_at,updated_at").order("created_at",{ascending:false});
   const {data:onboarding}=await sb.from("provider_onboarding_profiles").select("user_id,public_name,service_area_text,onboarding_status,availability_status,accepting_leads,submitted_at"); const om=new Map((onboarding??[]).map((r:any)=>[r.user_id,r]));
   return json({ok:true,admin:{label:adminLabel,userId:user.id},counts,requests,providers:(providers??[]).map((p:any)=>({...p,onboarding:om.get(p.user_id)??null})),users:users??[]});
  }
  if(action==="provider_detail"){
   const id=String(body.providerUserId??"").trim(); if(!id)return json({error:"Provider is required"},400);
   const {data:account,error:ae}=await sb.from("auth_profiles").select("user_id,email,full_name,role,provider_approved,created_at,updated_at").eq("user_id",id).eq("role","PROVIDER").maybeSingle(); if(ae)throw ae; if(!account)return json({error:"Provider not found"},404);
   const {data:onboarding}=await sb.from("provider_onboarding_profiles").select("provider_type,public_name,business_name,description,experience_years,service_area_text,availability_status,accepting_leads,onboarding_status,submitted_at,approved_at,created_at,updated_at").eq("user_id",id).maybeSingle();
   const {data:links}=await sb.from("provider_service_categories").select("category_id,is_active").eq("provider_user_id",id).order("created_at",{ascending:true}); const ids=(links??[]).map((x:any)=>x.category_id); let names:any[]=[]; if(ids.length){const {data}=await sb.from("service_categories").select("id,name").in("id",ids);names=data??[];}
   const categories=(links??[]).map((x:any)=>({...x,name:names.find((c:any)=>c.id===x.category_id)?.name||"Service category"}));
   const {data:hours}=await sb.from("provider_weekly_hours").select("day_of_week,is_working,start_time,end_time,timezone_name").eq("provider_user_id",id).order("day_of_week",{ascending:true});
   const {data:docs,error:de}=await sb.from("provider_verification_documents").select("id,document_type,document_label,storage_bucket,storage_path,review_status,review_note,reviewed_at,submitted_at,updated_at").eq("provider_user_id",id).order("submitted_at",{ascending:false}); if(de)throw de;
   const documents:any[]=[]; for(const d of docs??[]){const {data:signed}=await sb.storage.from(d.storage_bucket).createSignedUrl(d.storage_path,600);documents.push({...d,signed_url:signed?.signedUrl??null});}
   return json({ok:true,account,onboarding:onboarding??null,categories,hours:hours??[],documents});
  }
  if(action==="review_provider_document"){
   const providerUserId=String(body.providerUserId??"").trim(), documentId=String(body.documentId??"").trim(), status=String(body.status??"").trim().toUpperCase(), note=String(body.note??"").trim();
   if(!providerUserId||!documentId)return json({error:"Provider and document are required"},400); if(!["APPROVED","REQUEST_INFO","REJECTED"].includes(status))return json({error:"Invalid document review status"},400);
   const {data,error}=await sb.from("provider_verification_documents").update({review_status:status,review_note:note||null,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",documentId).eq("provider_user_id",providerUserId).select("id,document_type,review_status,review_note,reviewed_at").maybeSingle(); if(error)throw error; if(!data)return json({error:"Provider document not found"},404);
   await sb.from("security_events").insert({event_type:"ADMIN_PROVIDER_DOCUMENT_REVIEWED",severity:"INFO",entity_type:"provider_verification_document",entity_id:documentId,metadata:{target_user_id:providerUserId,document_type:data.document_type,review_status:status,admin_auth_user_id:user.id,admin_label:adminLabel}}); return json({ok:true,document:data});
  }
  if(action==="approve_provider"){
   const id=String(body.providerUserId??"").trim(), approved=Boolean(body.approved); const {data,error}=await sb.from("auth_profiles").update({provider_approved:approved}).eq("user_id",id).eq("role","PROVIDER").select("user_id,email,full_name,provider_approved").maybeSingle(); if(error)throw error;if(!data)return json({error:"Provider not found"},404);
   await sb.from("provider_onboarding_profiles").update({onboarding_status:approved?"APPROVED":"SUSPENDED",accepting_leads:approved,approved_at:approved?new Date().toISOString():null}).eq("user_id",id); await sb.from("security_events").insert({event_type:approved?"ADMIN_PROVIDER_APPROVED":"ADMIN_PROVIDER_DISABLED",severity:"INFO",entity_type:"auth_profile",entity_id:id,metadata:{target_user_id:id,admin_auth_user_id:user.id,admin_label:adminLabel}}); return json({ok:true,provider:data});
  }
  if(action==="set_provider_onboarding_status"){
   const id=String(body.providerUserId??"").trim(), status=String(body.status??"").trim().toUpperCase(); if(!["SUBMITTED","APPROVED","REJECTED","SUSPENDED"].includes(status))return json({error:"Invalid provider status"},400); const approved=status==="APPROVED";
   const {data,error}=await sb.from("provider_onboarding_profiles").update({onboarding_status:status,approved_at:approved?new Date().toISOString():null,accepting_leads:approved}).eq("user_id",id).select("user_id,onboarding_status").maybeSingle(); if(error)throw error;if(!data)return json({error:"Provider onboarding profile not found"},404); await sb.from("auth_profiles").update({provider_approved:approved}).eq("user_id",id).eq("role","PROVIDER"); await sb.from("security_events").insert({event_type:"ADMIN_PROVIDER_STATUS_CHANGED",severity:"INFO",entity_type:"auth_profile",entity_id:id,metadata:{target_user_id:id,new_status:status,admin_auth_user_id:user.id,admin_label:adminLabel}}); return json({ok:true,onboarding:data});
  }
  if(action==="set_user_role"){
   const id=String(body.targetUserId??"").trim(), role=String(body.role??"").trim().toUpperCase(); if(!id)return json({error:"Target user is required"},400); if(!["CUSTOMER","PROVIDER"].includes(role))return json({error:"Only Customer or Provider can be assigned here"},400); if(id===user.id)return json({error:"You cannot change your own Admin role from this screen"},409); const providerApproved=role==="PROVIDER"?Boolean(body.providerApproved):false;
   const {data,error}=await sb.from("auth_profiles").update({role,provider_approved:providerApproved}).eq("user_id",id).select("user_id,email,full_name,role,provider_approved,updated_at").maybeSingle(); if(error)throw error;if(!data)return json({error:"User not found"},404); if(role!=="PROVIDER")await sb.from("provider_onboarding_profiles").update({onboarding_status:"SUSPENDED",accepting_leads:false}).eq("user_id",id); await sb.from("security_events").insert({event_type:"ADMIN_USER_ROLE_CHANGED",severity:"INFO",entity_type:"auth_profile",entity_id:id,metadata:{target_user_id:id,new_role:role,provider_approved:providerApproved,admin_auth_user_id:user.id,admin_label:adminLabel}}); return json({ok:true,user:data});
  }
  if(action==="history"){
   const ticket=String(body.ticketNumber??"").trim().toUpperCase(); const {data:r}=await sb.from("request_intake").select("id").eq("ticket_number",ticket).maybeSingle(); if(!r)return json({error:"Request not found"},404); const {data,error}=await sb.from("request_status_history").select("from_status,to_status,actor_type,note,created_at").eq("request_id",r.id).order("created_at",{ascending:true}); if(error)throw error; return json({ok:true,history:data??[]});
  }
  return json({error:"Unknown action"},400);
 }catch(e){console.error(e);return json({error:"Unable to process admin request"},500);}
});
