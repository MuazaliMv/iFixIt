import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, authorization, apikey, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const enc=new TextEncoder();
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});}
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); if(!jwt)return json({error:"Sign in required"},401);
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const {data:{user},error:userError}=await supabase.auth.getUser(jwt); if(userError||!user)return json({error:"Invalid session"},401);
  const body=await req.json(); const action=String(body.action??"dashboard").toLowerCase();
  const {data:profile}=await supabase.from("auth_profiles").select("role,full_name,email").eq("user_id",user.id).maybeSingle(); if(!profile)return json({error:"Account profile not found"},403);

  if(action==="bootstrap_admin"){
    const legacy=String(body.accessToken??"").trim(); if(legacy.length<20)return json({error:"Legacy admin code required"},401);
    const {data:a}=await supabase.from("admin_access_tokens").select("id").eq("token_hash",await hash(legacy)).eq("is_active",true).maybeSingle(); if(!a)return json({error:"Legacy admin code denied"},401);
    const {error}=await supabase.from("auth_profiles").update({role:"ADMIN",provider_approved:false}).eq("user_id",user.id); if(error)throw error;
    return json({ok:true,role:"ADMIN"});
  }

  if(profile.role!=="ADMIN")return json({error:"Administrator role required"},403);
  const adminLabel=profile.full_name||profile.email||"Admin";

  if(action==="dashboard"){
    const {data,error}=await supabase.from("request_intake").select("ticket_number,service_name,service_location_text,preferred_date,problem_description,status,assigned_provider_label,created_at,updated_at").order("created_at",{ascending:false}).limit(300); if(error)throw error;
    const requests=data??[]; const counts={total:requests.length,new:0,accepted:0,processing:0,completed:0};
    for(const r of requests){if(r.status==="NEW")counts.new++;else if(r.status==="ACCEPTED")counts.accepted++;else if(r.status==="PROCESSING")counts.processing++;else if(r.status==="COMPLETED")counts.completed++;}
    const {data:providers}=await supabase.from("auth_profiles").select("user_id,email,full_name,provider_approved,created_at").eq("role","PROVIDER").order("created_at",{ascending:false});
    const {data:users}=await supabase.from("auth_profiles").select("user_id,email,full_name,role,provider_approved,created_at,updated_at").order("created_at",{ascending:false});
    return json({ok:true,admin:{label:adminLabel,userId:user.id},counts,requests,providers:providers??[],users:users??[]});
  }

  if(action==="approve_provider"){
    const providerUserId=String(body.providerUserId??"").trim(); const approved=Boolean(body.approved);
    const {data,error}=await supabase.from("auth_profiles").update({provider_approved:approved}).eq("user_id",providerUserId).eq("role","PROVIDER").select("user_id,email,full_name,provider_approved").maybeSingle(); if(error)throw error; if(!data)return json({error:"Provider not found"},404);
    await supabase.from("security_events").insert({user_id:user.id,event_type:approved?"ADMIN_PROVIDER_APPROVED":"ADMIN_PROVIDER_DISABLED",severity:"INFO",entity_type:"auth_profile",entity_id:providerUserId,metadata:{target_user_id:providerUserId,admin_label:adminLabel}});
    return json({ok:true,provider:data});
  }

  if(action==="set_user_role"){
    const targetUserId=String(body.targetUserId??"").trim(); const role=String(body.role??"").trim().toUpperCase();
    if(!targetUserId)return json({error:"Target user is required"},400);
    if(!["CUSTOMER","PROVIDER"].includes(role))return json({error:"Only Customer or Provider can be assigned here"},400);
    if(targetUserId===user.id)return json({error:"You cannot change your own Admin role from this screen"},409);
    const providerApproved=role==="PROVIDER"?Boolean(body.providerApproved):false;
    const {data,error}=await supabase.from("auth_profiles").update({role,provider_approved:providerApproved}).eq("user_id",targetUserId).select("user_id,email,full_name,role,provider_approved,updated_at").maybeSingle();
    if(error)throw error; if(!data)return json({error:"User not found"},404);
    await supabase.from("security_events").insert({user_id:user.id,event_type:"ADMIN_USER_ROLE_CHANGED",severity:"INFO",entity_type:"auth_profile",entity_id:targetUserId,metadata:{target_user_id:targetUserId,new_role:role,provider_approved:providerApproved,admin_label:adminLabel}});
    return json({ok:true,user:data});
  }

  if(action==="history"){
    const ticket=String(body.ticketNumber??"").trim().toUpperCase(); const {data:r}=await supabase.from("request_intake").select("id").eq("ticket_number",ticket).maybeSingle(); if(!r)return json({error:"Request not found"},404);
    const {data,error}=await supabase.from("request_status_history").select("from_status,to_status,changed_by_role,changed_by_label,created_at").eq("request_id",r.id).order("created_at",{ascending:true}); if(error)throw error;
    return json({ok:true,history:data??[]});
  }
  return json({error:"Unknown action"},400);
 }catch(e){console.error(e);return json({error:"Unable to process admin request"},500);}
});