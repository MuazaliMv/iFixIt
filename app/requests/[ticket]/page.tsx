'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import './marketplace.css';

const DETAIL_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-requests';
const MARKET_API='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/customer-marketplace';
const MESSAGE_URL='https://yzlhlilxiszefneshatm.supabase.co/functions/v1/request-messages';

type RequestRow={id:string;ticket_number:string;service_name:string;service_category_code?:string|null;service_subcategory_code?:string|null;service_location_text:string;preferred_date:string;problem_description:string;urgency?:string|null;customer_notes?:string|null;status:string;assigned_provider_label?:string|null;assigned_provider_user_id?:string|null;accepted_at?:string|null;processing_at?:string|null;completed_at?:string|null;created_at:string;updated_at:string};
type HistoryRow={from_status?:string|null;to_status:string;actor_type?:string|null;note?:string|null;created_at:string};
type MessageRow={id:string;sender_role:string;sender_label?:string|null;message_text:string;created_at:string};
type ProviderCard={userId:string;name:string;businessName?:string|null;description?:string|null;profilePhotoUrl?:string|null;experienceYears:number;specialty:string[];rating:number|null;reviewCount:number;completedJobs:number;verified:boolean;availability:string;message?:string|null;responseStatus?:string|null};
type Inspection={id:string;preferred_slots:string[];scheduled_start?:string|null;duration_minutes?:number|null;status:string;provider_note?:string|null};
type Estimate={id:string;findings:string;recommended_work:string;estimated_minutes?:number|null;labour_amount:number|string;material_amount:number|string;total_amount:number|string;currency:string;status:string;customer_note?:string|null;sent_at:string;decided_at?:string|null};
type Completion={id:string;work_performed:string[];labour_amount:number|string;material_amount:number|string;final_amount:number|string;currency:string;payment_note:string;status:string;submitted_at:string;confirmed_at?:string|null;issue_note?:string|null};
type Review={satisfied?:boolean|null;rating?:number|null;review_text?:string|null;created_at?:string};
type Journey={request:RequestRow;providerOptions:ProviderCard[];selectedProvider:ProviderCard|null;inspection:Inspection|null;estimate:Estimate|null;completion:Completion|null;review:Review|null;paymentProcessing:boolean};

type MainTab='overview'|'confirm'|'messages';

function money(value:number|string|undefined,currency='MVR'){const n=Number(value||0);return `${currency} ${Number.isFinite(n)?n.toFixed(0):'0'}`;}
function when(value?:string|null){if(!value)return 'Not set';const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});}
function shortStatus(value:string){return value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}
function initials(name?:string|null){return (name||'P').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();}

export default function RequestDetailPage(){
 const params=useParams<{ticket:string}>();
 const ticket=decodeURIComponent(String(params.ticket||'')).toUpperCase();
 const[request,setRequest]=useState<RequestRow|null>(null);
 const[history,setHistory]=useState<HistoryRow[]>([]);
 const[messages,setMessages]=useState<MessageRow[]>([]);
 const[journey,setJourney]=useState<Journey|null>(null);
 const[message,setMessage]=useState('Loading request…');
 const[busy,setBusy]=useState(false);
 const[text,setText]=useState('');
 const[showSchedule,setShowSchedule]=useState(false);
 const[slots,setSlots]=useState(['','','']);
 const[estimateNote,setEstimateNote]=useState('');
 const[satisfied,setSatisfied]=useState<boolean|null>(null);
 const[rating,setRating]=useState(0);
 const[reviewText,setReviewText]=useState('');
 const[problemText,setProblemText]=useState('');
 const[tab,setTab]=useState<MainTab>('overview');

 useEffect(()=>{if(ticket)void load();},[ticket]);

 async function token(){const{data}=await supabase.auth.getSession();if(!data.session){window.location.href='/login';return '';}return data.session.access_token;}
 async function load(){setBusy(true);try{const t=await token();if(!t)return;const headers={'Content-Type':'application/json','Authorization':`Bearer ${t}`};const[detailResponse,marketResponse]=await Promise.all([
  fetch(DETAIL_API,{method:'POST',headers,body:JSON.stringify({action:'detail',ticketNumber:ticket})}),
  fetch(MARKET_API,{method:'POST',headers,body:JSON.stringify({action:'journey',ticketNumber:ticket})})
 ]);const detail=await detailResponse.json();const market=await marketResponse.json();if(!detailResponse.ok)throw new Error(detail?.error||'Unable to load request');if(!marketResponse.ok)throw new Error(market?.error||'Unable to load marketplace journey');setRequest(market.request||detail.request);setHistory(detail.history||[]);setMessages(detail.messages||[]);setJourney(market as Journey);setMessage('Request is up to date.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to load request.');}finally{setBusy(false);}}
 async function marketAction(action:string,payload:Record<string,unknown>={}){setBusy(true);try{const t=await token();if(!t)return null;const r=await fetch(MARKET_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action,ticketNumber:ticket,...payload})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to update request');setJourney(p as Journey);setRequest(p.request||request);setMessage('Request updated successfully.');return p;}catch(e){setMessage(e instanceof Error?e.message:'Unable to update request.');return null;}finally{setBusy(false);}}
 async function selectProvider(providerUserId:string){const p=await marketAction('select_provider',{providerUserId});if(p)await load();}
 async function proposeInspection(){const preferredSlots=slots.map(x=>x.trim()).filter(Boolean);if(!preferredSlots.length){setMessage('Choose at least one preferred inspection time.');return;}const p=await marketAction('propose_inspection',{preferredSlots});if(p){setShowSchedule(false);setSlots(['','','']);await load();}}
 async function decideEstimate(decision:'APPROVE'|'DECLINE'){const p=await marketAction('decide_estimate',{decision,note:estimateNote.trim()||null});if(p){setEstimateNote('');await load();}}
 async function confirmCompletion(){if(satisfied===null){setMessage('Please tell us whether you are satisfied.');return;}if(rating<1||rating>5){setMessage('Please select a rating from 1 to 5 stars.');return;}const p=await marketAction('confirm_completion',{satisfied,rating,review:reviewText.trim()});if(p){await load();setTab('overview');}}
 async function reportProblem(){if(problemText.trim().length<5){setMessage('Please describe the problem before reporting it.');return;}const p=await marketAction('report_problem',{note:problemText.trim()});if(p){setProblemText('');await load();}}
 async function send(){if(!text.trim())return;setBusy(true);try{const t=await token();const r=await fetch(MESSAGE_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({action:'send',ticketNumber:ticket,message:text.trim()})});const p=await r.json();if(!r.ok)throw new Error(p?.error||'Unable to send message');setText('');await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to send message.');}finally{setBusy(false);}}

 const selected=journey?.selectedProvider||null;
 const inspection=journey?.inspection||null;
 const estimate=journey?.estimate||null;
 const completion=journey?.completion||null;
 const review=journey?.review||null;
 const completed=request?.status==='COMPLETED'&&Boolean(completion);
 const awaitingConfirm=completed&&completion?.status==='SUBMITTED';
 const closed=completed&&completion?.status==='CONFIRMED';
 const totalCost=completion?money(completion.final_amount,completion.currency):estimate?money(estimate.total_amount,estimate.currency):'—';
 const duration=inspection?.duration_minutes?`${inspection.duration_minutes} min`:'—';
 const progress=useMemo(()=>[
  {label:'Request Sent',sub:request?when(request.created_at):'',done:Boolean(request)},
  {label:'Providers Accepted',sub:`${journey?.providerOptions?.length||0} provider${(journey?.providerOptions?.length||0)===1?'':'s'}`,done:Boolean(selected)||Boolean(request&&request.status!=='NEW')},
  {label:'Provider Selected',sub:selected?.name||'Pending',done:Boolean(selected)},
  {label:'Inspection Completed',sub:inspection?.status==='COMPLETED'||estimate?when(estimate?.sent_at||inspection?.scheduled_start):'Pending',done:Boolean(estimate)||inspection?.status==='COMPLETED'},
  {label:'Work Completed',sub:completion?when(completion.submitted_at):'Pending',done:Boolean(completion)},
  {label:'Request Closed',sub:closed?'Confirmed':'Pending your confirmation',done:Boolean(closed)}
 ],[request,journey?.providerOptions?.length,selected,inspection,estimate,completion,closed]);

 if(!request)return <main className="ifixPage"><div className="ifixLoading"><div className="ifixLogo"><span>iFix</span><b>.It</b></div><p>{message}</p></div></main>;

 const Header=()=> <header className="ifixHeader"><a className="backButton" href="/requests" aria-label="Back">‹</a><a className="ifixLogo" href="/"><span>iFix</span><b>.It</b></a><div className="headerIcons"><button type="button" onClick={()=>setTab('messages')} aria-label="Messages">◌<i>{messages.length}</i></button><button type="button" aria-label="Notifications">♢<i>1</i></button></div></header>;

 const ProviderSummary=()=> selected?<section className="providerSummaryCard"><div className="providerProfileMain"><div className="providerPhoto">{selected.profilePhotoUrl?<img src={selected.profilePhotoUrl} alt=""/>:<span>{initials(selected.name)}</span>}</div><div className="providerDetails"><div className="providerTitleRow"><h2>{selected.name}</h2>{selected.verified?<span className="verifiedMark">◆</span>:null}</div><strong className="providerSpecialty">{selected.specialty?.[0]||selected.businessName||'Service Provider'}</strong><div className="ratingLine"><span className="star">★</span><b>{selected.rating??'New'}</b><span>({selected.reviewCount} reviews)</span></div><div className="completedJobsLine">▣ <span>Completed Jobs: {selected.completedJobs}</span></div>{selected.verified?<span className="verifiedPill">● Verified Provider</span>:null}</div></div><div className="providerMetrics"><div><span>▣</span><p>Completed On</p><strong>{when(request.completed_at)}</strong></div><div><span>◷</span><p>Total Time Taken</p><strong>{duration}</strong></div>{completed?<div><span>▱</span><p>{closed?'Total Paid':'Final Cost'}</p><strong className="greenText">{totalCost}</strong><small>Paid directly to provider</small></div>:<div><span>▣</span><p>Job Status</p><strong className="greenText">{shortStatus(request.status)}</strong></div>}</div></section>:null;

 const Progress=()=> <section className="progressCard"><h3>Request Progress</h3><div className="progressTrack">{progress.map((step,index)=><div className={`progressStep ${step.done?'done':''}`} key={step.label}><div className="progressDot">{step.done?'✓':index+1}</div><strong>{step.label}</strong><small>{step.sub}</small></div>)}</div></section>;

 const Messages=()=> <section className="screenCard"><div className="sectionHeading"><div><h2>Messages</h2><p>Customer ↔ Provider</p></div><span className="countPill">{messages.length}</span></div><div className="chatList">{messages.map(m=><div className={`chatBubble ${m.sender_role==='CUSTOMER'?'customer':''}`} key={m.id}><strong>{m.sender_label||m.sender_role}</strong><p>{m.message_text}</p><time>{when(m.created_at)}</time></div>)}{!messages.length?<div className="emptyState">No messages yet.</div>:null}</div><div className="messageComposer"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Message provider"/><button className="blueButton" onClick={()=>void send()} disabled={busy||!text.trim()}>Send</button></div></section>;

 const ConfirmScreen=()=> <>
  <section className="successBanner confirmBanner"><div className="successIcon">✓</div><div><h1>Confirm Completion</h1><p>Please confirm that you are satisfied with the work to close this request.</p></div><div className="shieldArt">✓</div></section>
  <ProviderSummary/>
  <section className="workVisualCard"><div className="workCopy"><h3>Work Completed</h3><p>{completion?.work_performed?.[0]||'The provider has marked the requested work as completed.'}</p></div><div className="photoCompare"><div className="photoPlaceholder"><span>Before</span><b>Before photo</b><small>Shown when uploaded</small></div><div className="compareArrow">→</div><div className="photoPlaceholder after"><span>After</span><b>After photo</b><small>Shown when uploaded</small></div></div></section>
  <section className="satisfactionCard"><h2>Are you satisfied with the work?</h2><p>Please confirm to close this request.</p><div className="satisfactionChoices"><button className={`satisfactionChoice yes ${satisfied===true?'selected':''}`} onClick={()=>setSatisfied(true)}><b>✓ Yes, I’m Satisfied</b><span>Confirm completion and close request</span></button><button className={`satisfactionChoice no ${satisfied===false?'selected':''}`} onClick={()=>setSatisfied(false)}><b>× No, I’m Not Satisfied</b><span>Report an issue or request rework</span></button></div><div className="infoStrip">ⓘ By confirming, this request will be marked as completed and closed.</div></section>
  <section className="feedbackCard"><div><h3>Rate Your Experience</h3><p>Share your feedback about {selected?.name||'your provider'}</p><div className="bigStars">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} className={n<=rating?'selected':''}>☆</button>)}</div><small>Tap to rate</small></div><div><h3>Share Your Feedback <span>(Optional)</span></h3><textarea maxLength={500} value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder="Write a review about your experience…"/><small className="charCount">{reviewText.length}/500</small></div></section>
  <section className="helpRebook"><div><b>▣</b><div><h3>Need more help?</h3><p>Book {selected?.name||'this provider'} again for any future service.</p></div></div><a className="blueButton" href="/#request">Rebook Provider</a></section>
  <section className="utilityRow"><button className="utilityButton" type="button"><b>▤</b><span>View Invoice / Report<small>Service report</small></span></button><button className="utilityButton" type="button" onClick={()=>setTab('messages')}><b>◌</b><span>Message Provider<small>Send a message</small></span></button><button className="utilityButton" type="button" disabled><b>⌕</b><span>Call Provider<small>Phone sharing unavailable</small></span></button></section>
  <div className="confirmSubmit"><button className="blueButton" disabled={busy||satisfied===null||rating===0} onClick={()=>void confirmCompletion()}>{busy?'Confirming…':'Confirm & Close Request'}</button></div>
 </>;

 const CompletedOverview=()=> <>
  <section className="successBanner"><div className="successIcon">✓</div><div><h1>Work Completed!</h1><p>{selected?.name||'Your provider'} has completed the job.<br/>Please review the work and confirm to close the request.</p></div><div className="statusMini"><span>▣</span><div><small>Job Status</small><strong>Completed</strong></div></div></section>
  <ProviderSummary/>
  <section className="requestSummaryCard"><div><h3>Request Summary</h3><div className="requestSummaryBody"><div className="requestThumb">▱</div><div><strong>{request.service_name}{request.service_subcategory_code?` • ${shortStatus(request.service_subcategory_code)}`:''}</strong><p>⌖ {request.service_location_text}</p><p>Request ID: <b>{request.ticket_number}</b></p></div></div></div><button className="outlineBlue" type="button">◉ View Request Details</button></section>
  <section className="workDoneCard"><div className="workList"><h3>Work Performed</h3><ul>{(completion?.work_performed?.length?completion.work_performed:['Work completed as requested']).map(item=><li key={item}><span>✓</span>{item}</li>)}</ul></div><div className="beforeAfterGrid"><div className="repairPhotoPlaceholder"><span>Before</span><b>Before photo</b><small>Shown when uploaded</small></div><div className="repairPhotoPlaceholder after"><span>After</span><b>After photo</b><small>Shown when uploaded</small></div></div></section>
  <section className="costReportGrid"><div className="costBox"><h3>Final Cost <span>(Paid Directly to Provider)</span></h3><div><span>Labour</span><strong>{money(completion?.labour_amount,completion?.currency)}</strong></div><div><span>Material</span><strong>{money(completion?.material_amount,completion?.currency)}</strong></div><div className="costTotal"><span>Total Paid</span><strong>{money(completion?.final_amount,completion?.currency)}</strong></div><p>ⓘ Payment is made directly to the provider. iFixIt does not handle service payments.</p></div><div className="reportBox"><h3>Invoice / Service Report</h3><div className="reportFile"><b>▤</b><div><strong>Service Report</strong><small>Available when provider uploads report</small></div><span>⇩</span></div><button className="outlineBlue" type="button">View Invoice / Report</button></div></section>
  <section className="nextActions"><h3>What would you like to do next?</h3><div className="actionTiles"><button className="actionTile green" onClick={()=>setTab('confirm')}><b>✓</b><strong>Confirm Completion</strong><span>Confirm that the work is completed.</span><i>›</i></button><button className="actionTile amber" onClick={()=>setTab('confirm')}><b>☆</b><strong>Rate & Review</strong><span>Share your experience with this provider.</span><i>›</i></button><a className="actionTile blue" href="/#request"><b>▣</b><strong>Rebook Provider</strong><span>Book {selected?.name||'this provider'} again.</span><i>›</i></a><button className="actionTile red" onClick={()=>document.getElementById('problem-box')?.scrollIntoView({behavior:'smooth'})}><b>!</b><strong>Report a Problem</strong><span>Something not right? Let us know.</span><i>›</i></button></div></section>
  <Progress/>
  <section className="footerActionRow"><button className="outlineBlue" onClick={()=>setTab('messages')}>◌ Message Provider</button><button className="outlineBlue" disabled>⌕ Call Provider</button><button className="outlineBlue" onClick={()=>document.getElementById('updates')?.scrollIntoView({behavior:'smooth'})}>☷ View All Updates</button></section>
  <section id="problem-box" className="screenCard problemCard"><h3>Report a Problem</h3><textarea value={problemText} onChange={e=>setProblemText(e.target.value)} placeholder="Describe what is wrong or what needs rework"/><button className="dangerButton" disabled={busy||problemText.trim().length<5} onClick={()=>void reportProblem()}>Report Problem</button></section>
 </>;

 const ActiveOverview=()=> <>
  <section className="activeHero"><div><span className="heroStatus">{shortStatus(request.status)}</span><h1>{request.service_name}</h1><p>{request.problem_description}</p><div className="heroMeta"><span>⌖ {request.service_location_text}</span><span>▣ {request.preferred_date}</span><span>#{request.ticket_number}</span></div></div><div className="activeHeroStep"><small>NEXT STEP</small><strong>{request.status==='NEW'?'Choose a provider':request.status==='ACCEPTED'&&!inspection?'Schedule inspection':request.status==='ACCEPTED'&&estimate?.status==='SENT'?'Review estimate':request.status==='PROCESSING'?'Work in progress':'Request in progress'}</strong></div></section>

  {request.status==='NEW'?<section className="screenCard"><div className="sectionHeading"><div><h2>Providers Accepted</h2><p>Choose the provider you want to work with.</p></div><span className="countPill">{journey?.providerOptions?.length||0}</span></div><div className="providerChoiceGrid">{journey?.providerOptions?.map(provider=><article className="providerChoice" key={provider.userId}><div className="providerChoiceTop"><div className="providerPhoto small">{provider.profilePhotoUrl?<img src={provider.profilePhotoUrl} alt=""/>:<span>{initials(provider.name)}</span>}</div><div><h3>{provider.name}</h3><p>{provider.specialty?.[0]||provider.businessName||'Service Provider'}</p><div className="ratingLine"><span className="star">★</span><b>{provider.rating??'New'}</b><span>({provider.reviewCount})</span></div></div>{provider.verified?<span className="verifiedPill">● Verified</span>:null}</div><div className="providerChoiceStats"><span><b>{provider.completedJobs}</b> jobs</span><span><b>{provider.experienceYears}</b> yrs experience</span><span><b>{shortStatus(provider.availability)}</b></span></div>{provider.message?<blockquote>{provider.message}</blockquote>:null}<div className="choiceActions"><button className="outlineBlue">View Profile</button><button className="blueButton" disabled={busy} onClick={()=>void selectProvider(provider.userId)}>Select Provider</button></div></article>)}{!journey?.providerOptions?.length?<div className="emptyState">No provider responses yet. Your request is still open.</div>:null}</div></section>:null}

  {request.status==='ACCEPTED'&&selected?<><ProviderSummary/><section className="screenCard"><div className="sectionHeading"><div><h2>Inspection</h2><p>{inspection?'Track the inspection journey':'Choose preferred inspection times.'}</p></div>{inspection?<span className="countPill">{shortStatus(inspection.status)}</span>:null}</div>{!inspection||showSchedule?<><div className="scheduleGrid">{slots.map((slot,index)=><label key={index}>Preferred time {index+1}<input type="datetime-local" value={slot} onChange={e=>setSlots(values=>values.map((v,i)=>i===index?e.target.value:v))}/></label>)}</div><div className="choiceActions"><button className="blueButton" onClick={()=>void proposeInspection()} disabled={busy}>Send Preferred Times</button>{inspection?<button className="outlineBlue" onClick={()=>setShowSchedule(false)}>Cancel</button>:null}</div></>:<div className="inspectionTimeline">{['SCHEDULED','ON_WAY','ARRIVED','INSPECTING','ESTIMATE_SENT'].map((s,index)=>{const order=['SCHEDULED','ON_WAY','ARRIVED','INSPECTING','ESTIMATE_SENT'];const current=order.indexOf(inspection.status);return <div className={index<=current?'inspectionStep done':'inspectionStep'} key={s}><span>{index<=current?'✓':index+1}</span><strong>{shortStatus(s)}</strong></div>})}<button className="outlineBlue" onClick={()=>setShowSchedule(true)}>Update Preferred Times</button></div>}</section></>:null}

  {estimate?<section className="screenCard"><div className="sectionHeading"><div><h2>Inspection Findings</h2><p>Review the work recommendation and estimate.</p></div><span className="countPill">{shortStatus(estimate.status)}</span></div><div className="estimateLayout"><div><h3>Findings</h3><p>{estimate.findings}</p><h3>Recommended Work</h3><p>{estimate.recommended_work}</p>{estimate.estimated_minutes?<p><b>Estimated time:</b> {estimate.estimated_minutes} minutes</p>:null}</div><div className="costBox"><div><span>Labour</span><strong>{money(estimate.labour_amount,estimate.currency)}</strong></div><div><span>Material</span><strong>{money(estimate.material_amount,estimate.currency)}</strong></div><div className="costTotal"><span>Total</span><strong>{money(estimate.total_amount,estimate.currency)}</strong></div></div></div>{estimate.status==='SENT'?<><textarea value={estimateNote} onChange={e=>setEstimateNote(e.target.value)} placeholder="Optional note to provider"/><div className="choiceActions"><button className="blueButton" onClick={()=>void decideEstimate('APPROVE')} disabled={busy}>Approve Work</button><button className="dangerOutline" onClick={()=>void decideEstimate('DECLINE')} disabled={busy}>Decline</button></div></>:null}</section>:null}

  {request.status==='PROCESSING'?<section className="successBanner processingBanner"><div className="successIcon tools">⌁</div><div><h1>Work in Progress</h1><p>{selected?.name||'Your provider'} is completing the approved work.</p></div><div className="statusMini"><small>Status</small><strong>Processing</strong></div></section>:null}
  <Progress/>
 </>;

 return <main className="ifixPage"><Header/><div className="ifixContent">{message&&message!=='Request is up to date.'?<div className="statusMessage">{message}</div>:null}{tab==='messages'?<Messages/>:tab==='confirm'&&awaitingConfirm?<ConfirmScreen/>:completed?<CompletedOverview/>:<ActiveOverview/>}<section id="updates" className="screenCard updatesCard"><div className="sectionHeading"><div><h2>All Updates</h2><p>Request activity history</p></div><span className="countPill">{history.length}</span></div><div className="updatesList">{history.map((h,i)=><div key={`${h.created_at}:${i}`}><span className="updateDot">✓</span><div><strong>{shortStatus(h.to_status)}</strong><p>{h.note||'Status updated'}</p><small>{when(h.created_at)}</small></div></div>)}{!history.length?<div className="emptyState">No updates yet.</div>:null}</div></section></div></main>;
}
