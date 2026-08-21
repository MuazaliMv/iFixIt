import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, authorization, apikey, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const clean=(v:unknown,max=80)=>String(v??"").trim().slice(0,max);

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
    if(!jwt)return json({error:"Sign in required"},401);
    const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const {data:{user},error:userError}=await sb.auth.getUser(jwt);
    if(userError||!user)return json({error:"Invalid session"},401);
    const {data:profile}=await sb.from("auth_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(!profile||!["CUSTOMER","PROVIDER","ADMIN"].includes(String(profile.role)))return json({error:"Account role not supported"},403);
    const body=await req.json().catch(()=>({}));
    const ticket=clean(body.ticketNumber,64).toUpperCase();
    if(!ticket)return json({error:"Ticket number required"},400);
    const {data:request,error:requestError}=await sb.from("request_intake").select("id,ticket_number,customer_auth_user_id,assigned_provider_user_id,status").eq("ticket_number",ticket).maybeSingle();
    if(requestError)throw requestError;
    if(!request)return json({error:"Request not found"},404);
    if(profile.role==="CUSTOMER"&&request.customer_auth_user_id!==user.id)return json({error:"Request does not belong to this account"},403);
    if(profile.role==="PROVIDER"&&request.assigned_provider_user_id!==user.id){
      const {data:response}=await sb.from("request_provider_responses").select("status").eq("request_id",request.id).eq("provider_user_id",user.id).maybeSingle();
      if(!response||["DECLINED","WITHDRAWN"].includes(String(response.status)))return json({error:"Request is not available to this provider"},403);
    }
    const {data:timeline,error:timelineError}=await sb.rpc("get_request_timeline",{p_request_id:request.id,p_viewer_role:profile.role,p_viewer_user_id:user.id});
    if(timelineError)throw timelineError;
    return json({ok:true,ticketNumber:request.ticket_number,timeline:timeline??[]});
  }catch(error){
    console.error(error);
    return json({error:error instanceof Error?error.message:"Unable to load request timeline"},500);
  }
});
