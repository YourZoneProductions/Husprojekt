"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "./HouseApp";
import type { ProjectPhoto } from "./ProjectPhotos";
import { dateDay } from "@/lib/timeline";

type Plan = {id:string;floor_id:string;file_path:string|null;created_at:string;floors:{name:string;house_id:string}|{name:string;house_id:string}[]};
const phases:Record<string,string>={before:"Før",during:"Undervejs",after:"Efter"};
export default function QuoteDraft({project, taskId, houseId, onClose}: {project:Project; taskId:string; houseId:string; onClose:()=>void}) {
 const task=project.subtasks.find(value=>value.id===taskId)!;
 const [title,setTitle]=useState(task?.name??"");
 const [description,setDescription]=useState(task?.description??"");
 const [requestedBy,setRequestedBy]=useState(task?.due_date??"");
 const [photos,setPhotos]=useState<ProjectPhoto[]>([]),[plans,setPlans]=useState<Plan[]>([]);
 const [photoIds,setPhotoIds]=useState<string[]>([]),[planId,setPlanId]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[preview,setPreview]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[retry,setRetry]=useState(0);
 const lock=useRef(false),alive=useRef(true);
 const [ready,setReady]=useState(false);
 const section=useRef<HTMLElement>(null);
 useEffect(()=>{section.current?.scrollIntoView?.({behavior:"smooth",block:"start"});},[]);
 useEffect(()=>{let cancelled=false;alive.current=true;setLoading(true);setReady(false);setError("");
  async function load(){try{
   const client=createClient();
   const [pictures,drawings,draft]=await Promise.all([
    client.from("project_photos").select("id,project_id,stage,taken_on,description,file_path,created_at").eq("project_id",project.id).order("taken_on",{ascending:false}),
    client.from("floor_plans").select("id,floor_id,file_path,created_at,floors!inner(name,house_id)").eq("floors.house_id",houseId).order("created_at",{ascending:false}),
    client.from("quote_drafts").select("title,description,requested_by,photo_ids,floor_plan_id").eq("subtask_id",taskId).maybeSingle(),
   ]);
   if(pictures.error||drawings.error||draft.error)throw new Error();
   if(!cancelled){setReady(true);setPhotos(pictures.data??[]);setPlans(drawings.data??[]);if(draft.data){setTitle(draft.data.title);setDescription(draft.data.description);setRequestedBy(draft.data.requested_by??"");setPhotoIds(draft.data.photo_ids??[]);setPlanId(draft.data.floor_plan_id??"");}}
  }catch{if(!cancelled)setError("Kladden og bilagene kunne ikke hentes. Prøv igen, før du gemmer.");}
  finally{if(!cancelled)setLoading(false);}}
  void load();return ()=>{cancelled=true;alive.current=false;};
 },[project.id,taskId,houseId,retry]);
 function validate(){
  if(!title.trim()||title.trim().length>120||!description.trim()||description.trim().length>5000)return "Skriv en titel og en beskrivelse af arbejdet.";
  if(requestedBy&&dateDay(requestedBy)===null)return "Vælg en gyldig ønsket dato, eller lad feltet være tomt.";
  if(photoIds.length>20)return "Vælg højst 20 billeder.";
  if(photoIds.some(id=>!photos.some(photo=>photo.id===id))||(planId&&!plans.some(plan=>plan.id===planId)))return "Et valgt bilag er ikke længere tilgængeligt. Hent kladden igen.";
  return "";
 }
 async function save(){
  if(lock.current||loading||!ready)return;const problem=validate();if(problem){setError(problem);return;}
  lock.current=true;setSaving(true);setError("");setNotice("");
  try{const {error}=await createClient().from("quote_drafts").upsert({project_id:project.id,subtask_id:taskId,title:title.trim(),description:description.trim(),requested_by:requestedBy||null,photo_ids:photoIds,floor_plan_id:planId||null},{onConflict:"subtask_id"});
   if(error)throw error;if(alive.current)setNotice("Tilbudskladden er gemt privat. Ingen har fået adgang eller modtaget en besked.");
  }catch{if(alive.current)setError("Kladden kunne ikke gemmes. Dine indtastninger er bevaret.");}
  finally{lock.current=false;if(alive.current)setSaving(false);}
 }
 const selectedPhotos=photos.filter(photo=>photoIds.includes(photo.id));const selectedPlan=plans.find(plan=>plan.id===planId);
 const planLabel=(plan:Plan)=>`${(Array.isArray(plan.floors)?plan.floors[0]:plan.floors)?.name??"Plantegning"} · ${new Date(plan.created_at).toLocaleDateString("da-DK",{timeZone:"Europe/Copenhagen"})}`;
 const field="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base";
 return <section ref={section} className="mt-6 min-w-0 rounded-xl border border-slate-300 bg-white p-4 sm:p-6" aria-label="Tilbudskladde" aria-busy={loading||saving}>
  <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-semibold">Forbered tilbud</h3><p className="mt-1 text-sm text-slate-600">Delopgave: {task?.name}</p></div><button type="button" disabled={saving} className="rounded-lg border px-3 py-2 text-sm" onClick={onClose}>Luk kladde</button></div>
  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Privat kladde. Håndværkeradgang og afsendelse er ikke tilkoblet endnu. Budget, forbrug og andre delopgaver indgår ikke i pakken.</p>
  {loading&&<p role="status" className="mt-3 text-sm">Henter kladde og bilag…</p>}
  {error&&<p role="alert" className="mt-3 text-sm text-red-800">{error}<button type="button" disabled={saving} className="ml-3 underline" onClick={()=>setRetry(value=>value+1)}>Hent kladden igen</button></p>}
  {notice&&<p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}
  {!preview ? <fieldset disabled={loading||saving||!ready} className="mt-4 space-y-4">
   <label className="block text-sm font-medium">Titel<input aria-label="Tilbudstitel" className={field} maxLength={120} value={title} onChange={event=>{setTitle(event.target.value);setNotice("");}}/></label>
   <label className="block text-sm font-medium">Beskriv arbejdet<textarea aria-label="Tilbudsbeskrivelse" className={field} rows={4} maxLength={5000} value={description} onChange={event=>{setDescription(event.target.value);setNotice("");}} placeholder="Hvad skal udføres, og hvad skal håndværkeren afklare?"/></label>
   <label className="block min-w-0 text-sm font-medium">Ønsket afslutningsdato (valgfri)<input aria-label="Ønsket afslutningsdato" className={field} type="date" value={requestedBy} onChange={event=>setRequestedBy(event.target.value)}/></label>
   <div><p className="text-sm font-medium">Vælg billeder fra dette projekt · højst 20</p>{!photos.length&&<p className="mt-2 text-sm text-slate-500">Tilføj billeder i projektets billedarkiv, og åbn kladden igen.</p>}
    {photos.map(photo=><label key={photo.id} className="mt-2 flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" aria-label={`Vedhæft billede ${photo.id}`} checked={photoIds.includes(photo.id)} onChange={event=>setPhotoIds(current=>event.target.checked?[...current,photo.id]:current.filter(id=>id!==photo.id))}/><span className="min-w-0 break-words">{phases[photo.stage]} · {photo.taken_on} · {photo.description||"Uden beskrivelse"}</span></label>)}
   </div>
   <label className="block text-sm font-medium">Plantegning (valgfri)<select aria-label="Vedhæft plantegning" className={field} value={planId} onChange={event=>setPlanId(event.target.value)}><option value="">Ingen plantegning</option>{plans.map(plan=><option key={plan.id} value={plan.id}>{planLabel(plan)}</option>)}</select></label>
   <p className="text-xs text-slate-500">En hel plantegning kan vise andre rum, og originale billeder kan indeholde placering og andre metadata. Gennemse bilagene før senere deling.</p>
   <div className="flex flex-wrap gap-3"><button type="button" className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white" onClick={()=>{const problem=validate();if(problem)setError(problem);else{setError("");setPreview(true);}}}>Gennemse tilbudspakke</button><button type="button" className="rounded-lg border px-4 py-3 text-sm" onClick={()=>void save()}>{saving?"Gemmer…":"Gem privat kladde"}</button></div>
  </fieldset> : <div className="mt-4 space-y-4">
   <p className="text-sm font-medium text-slate-500">Forhåndsvisning · endnu ikke delt</p><h4 className="break-words text-xl font-semibold">{title}</h4><p className="whitespace-pre-wrap break-words text-sm">{description}</p><p className="text-sm">Ønsket afslutning: {requestedBy||"Efter aftale"}</p>
   <p className="text-sm font-medium">Bilag: {selectedPhotos.length} billeder{selectedPlan?" og 1 plantegning":""}</p>
   {selectedPhotos.map(photo=><QuoteAttachment key={photo.id} label={`${phases[photo.stage]} · ${photo.taken_on} · ${photo.description||"Uden beskrivelse"}`} bucket="project-photos" path={photo.file_path} prefix={project.id}/>)}
   {selectedPlan?.file_path&&<QuoteAttachment label={planLabel(selectedPlan)} bucket="floor-plans" path={selectedPlan.file_path} prefix={selectedPlan.floor_id}/>}
   <div className="flex flex-wrap gap-3"><button type="button" disabled={saving} className="rounded-lg border px-4 py-3 text-sm" onClick={()=>setPreview(false)}>Ret kladden</button><button type="button" disabled={saving||loading||!ready} className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white" onClick={()=>void save()}>{saving?"Gemmer…":"Gem privat kladde"}</button></div>
  </div>}
 </section>;
}
function QuoteAttachment({label,bucket,path,prefix}:{label:string;bucket:string;path:string;prefix:string}){
 const [url,setUrl]=useState("");const [failed,setFailed]=useState(false);
 useEffect(()=>{let cancelled=false,objectUrl="";
  async function load(){try{if(!path.startsWith(`${prefix}/`))throw new Error();const {data,error}=await createClient().storage.from(bucket).download(path);if(error||!data)throw new Error();if(!cancelled){objectUrl=URL.createObjectURL(data);setUrl(objectUrl);}}catch{if(!cancelled)setFailed(true);}}
  void load();return ()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[bucket,path,prefix]);
 return <figure className="min-w-0 rounded-lg border p-3"><figcaption className="mb-2 whitespace-pre-wrap break-words text-sm">{label}</figcaption>{failed?<p className="text-sm text-red-800">Bilaget kunne ikke vises. Kontrollér det før senere deling.</p>:url?<a href={url} target="_blank" rel="noreferrer" aria-label={`Åbn bilag: ${label}`}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={url} alt={label} onError={()=>setFailed(true)} className="max-h-80 max-w-full rounded object-contain"/></a>:<p className="text-sm text-slate-500">Henter bilag…</p>}</figure>;
}
