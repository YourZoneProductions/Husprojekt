"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateFloorPlanFile } from "@/lib/floor-plan-files";
import { dateDay } from "@/lib/timeline";

export type ProjectPhoto = {id: string; project_id: string; stage: string; taken_on: string; description: string; file_path: string; created_at: string};
const stages = {before:"Før",during:"Undervejs",after:"Efter"};
const bucket = "project-photos";
const fields = "id,project_id,stage,taken_on,description,file_path,created_at";

export default function ProjectPhotos({projectId, today, uploadOnly = false, onUploaded, onUploadingChange}: {projectId: string; today: string; uploadOnly?: boolean; onUploaded?: (photo: ProjectPhoto) => void; onUploadingChange?: (busy: boolean) => void}) {
  const [photos,setPhotos]=useState<ProjectPhoto[]>([]);
  const [stage,setStage]=useState("before");
  const [date,setDate]=useState(today);
  const [description,setDescription]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [filter,setFilter]=useState("all");
  const [selected,setSelected]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [retry,setRetry]=useState(0);
  const lock=useRef(false),alive=useRef(true),generation=useRef(0);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{onUploadingChange?.(saving);},[saving,onUploadingChange]);
  useEffect(()=>{
    alive.current=true;const current=++generation.current;setLoading(true);setError("");
    async function load(){try{
      const {data,error}=await createClient().from("project_photos").select(fields).eq("project_id",projectId).order("taken_on",{ascending:false}).order("created_at",{ascending:false});
      if(error)throw error;
      if(alive.current&&current===generation.current){setPhotos(data??[]);setSelected(value=>(data??[]).some(photo=>photo.id===value)?value:data?.[0]?.id??"");}
    }catch{if(alive.current&&current===generation.current)setError("Billedarkivet kunne ikke hentes. Prøv igen.");}
    finally{if(alive.current&&current===generation.current)setLoading(false);}}
    void load();return ()=>{alive.current=false;};
  },[projectId,retry]);
  async function upload(event: React.FormEvent){
    event.preventDefault();if(lock.current)return;
    if(!file)return setError("Vælg et billede.");
    if(dateDay(date)===null)return setError("Vælg en gyldig billeddato.");
    if(!(stage in stages)||description.length>1000)return setError("Kontrollér kategori og beskrivelse.");
    lock.current=true;setSaving(true);setError("");setNotice("");
    const client=createClient();let path="",saved=false;
    try{
      let extension:string;
      try{extension=await validateFloorPlanFile(file);}catch{throw new Error("Vælg et gyldigt PNG-, JPG- eller WebP-billede på højst 10 MB. HEIC og video understøttes ikke endnu.");}
      path=`${projectId}/${crypto.randomUUID()}.${extension}`;
      const upload=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false,cacheControl:"0"});
      if(upload.error){path="";throw new Error("Billedet kunne ikke uploades. Prøv igen.");}
      const result=await client.from("project_photos").insert({project_id:projectId,stage,taken_on:date,description:description.trim(),file_path:path}).select(fields).single();
      if(result.error||!result.data)throw new Error("Billedets oplysninger kunne ikke gemmes. Prøv igen.");
      saved=true;
      if(alive.current){generation.current++;setPhotos(current=>[result.data,...current].sort((a,b)=>b.taken_on.localeCompare(a.taken_on)||b.created_at.localeCompare(a.created_at)));setSelected(result.data.id);setFilter("all");setDescription("");setFile(null);if(input.current)input.current.value="";setNotice(uploadOnly ? "Billedet er gemt i arkivet. Kontrollér bilagsvalget i kladden." : "Billedet er gemt privat i projektets historik.");onUploaded?.(result.data as ProjectPhoto);}
    }catch(failure){
      if(path&&!saved){try{const result=await client.storage.from(bucket).remove([path]);if(result.error)throw result.error;}catch{if(alive.current)setNotice("En fil kan være uploadet uden at være tilknyttet. Dine tidligere billeder er bevaret.");}}
      if(alive.current)setError(failure instanceof Error?failure.message:"Billedet kunne ikke gemmes.");
    }finally{lock.current=false;if(alive.current){setSaving(false);setLoading(false);}}
  }
  const visible=photos.filter(photo=>filter==="all"||photo.stage===filter);
  const photo=visible.find(photo=>photo.id===selected)??visible[0];
  const field="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base";
  return <section className="mt-6 min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Projektets billedarkiv" aria-busy={loading||saving}>
    <h3 className="text-xl font-semibold text-slate-900">{uploadOnly ? "Nyt billede til tilbuddet" : "Billedarkiv"}</h3>
    <p className="mt-2 text-sm text-slate-600">Gem projektets historie før, undervejs og efter arbejdet. Billederne er private for husets medlemmer og deles ikke med håndværkere endnu.</p>
    <form onSubmit={upload} className="mt-4">
      <fieldset disabled={saving||loading} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Fase<select aria-label="Billedets fase" className={field} value={stage} onChange={event=>setStage(event.target.value)}>{Object.entries(stages).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium">Billeddato<input aria-label="Billeddato" className={field} type="date" required value={date} onChange={event=>setDate(event.target.value)}/></label>
        <label className="text-sm font-medium sm:col-span-2">Beskrivelse (valgfri)<textarea aria-label="Billedbeskrivelse" className={field} maxLength={1000} rows={2} value={description} onChange={event=>setDescription(event.target.value)} placeholder="Fx Kabelføring inden væggen blev lukket"/></label>
        <label className="min-w-0 text-sm font-medium sm:col-span-2">Billede · PNG, JPG eller WebP, højst 10 MB<input ref={input} aria-label="Vælg projektbillede" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full min-w-0 text-sm" onChange={event=>setFile(event.target.files?.[0]??null)}/></label>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white disabled:opacity-50">{saving?"Gemmer billede…":"Gem billede"}</button>
      </fieldset>
    </form>
    {loading&&<p role="status" className="mt-4 text-sm">Henter billedarkiv…</p>}
    {error&&<div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}<button type="button" disabled={saving} className="ml-3 underline" onClick={()=>setRetry(value=>value+1)}>Hent arkivet igen</button></div>}
    {notice&&<p role="status" className="mt-4 text-sm text-emerald-800">{notice}</p>}
    {!uploadOnly && <>
    <label className="mt-6 block text-sm font-medium">Vis fase<select aria-label="Filtrér billedarkiv" className={field} value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Alle billeder ({photos.length})</option>{Object.entries(stages).map(([value,label])=><option key={value} value={value}>{label} ({photos.filter(photo=>photo.stage===value).length})</option>)}</select></label>
    {!loading&&!visible.length&&!error&&<p className="mt-4 text-sm text-slate-500">Ingen billeder i denne visning endnu.</p>}
    {!!visible.length&&<label className="mt-4 block text-sm font-medium">Gemte billeder<select aria-label="Vælg gemt projektbillede" className={field} value={photo?.id??""} onChange={event=>setSelected(event.target.value)}>{visible.map(item=><option key={item.id} value={item.id}>{item.taken_on} · {stages[item.stage as keyof typeof stages]} · {item.description.slice(0,70)||"Uden beskrivelse"}</option>)}</select></label>}
    {photo&&<PhotoImage key={photo.id} photo={photo}/>}
    </>}
  </section>;
}

function PhotoImage({photo}: {photo:ProjectPhoto}){
  const [url,setUrl]=useState("");const [error,setError]=useState("");const [retry,setRetry]=useState(0);const [zoom,setZoom]=useState(100);
  useEffect(()=>{let cancelled=false,objectUrl="";setUrl("");setError("");
    async function load(){try{
      if(!photo.file_path.startsWith(`${photo.project_id}/`))throw new Error();
      const {data,error}=await createClient().storage.from(bucket).download(photo.file_path);if(error||!data)throw error??new Error();
      if(!cancelled){objectUrl=URL.createObjectURL(data);setUrl(objectUrl);}
    }catch{if(!cancelled)setError("Billedet kunne ikke hentes eller vises.");}}
    void load();return ()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[photo.file_path,photo.project_id,retry]);
  if(error)return <p role="alert" className="mt-4 text-sm text-red-800">{error}<button type="button" className="ml-3 underline" onClick={()=>setRetry(value=>value+1)}>Prøv billedet igen</button></p>;
  if(!url)return <p role="status" className="mt-4 text-sm">Henter billedet…</p>;
  return <figure className="mt-4 min-w-0">
    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm"><button type="button" aria-label="Forstør projektbillede" className="rounded border px-3 py-2" onClick={()=>setZoom(value=>value===100?200:100)}>{zoom===100?"Forstør":"Tilpas"}</button><a className="underline" href={url} download={`projektbillede-${photo.taken_on}.${photo.file_path.split('.').pop()}`}>Download billede</a></div>
    <div className="max-h-[32rem] overflow-auto rounded-lg border bg-slate-100" tabIndex={0} role="region" aria-label="Projektbillede med zoom og rulning"><div style={{width:`${zoom}%`}}>
      {/* Private authenticated blob URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={photo.description||`${stages[photo.stage as keyof typeof stages]} · ${photo.taken_on}`} onError={()=>setError("Billedet kunne ikke hentes eller vises.")} className="block h-auto w-full max-w-none"/>
    </div></div>
    <figcaption className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">{stages[photo.stage as keyof typeof stages]} · {photo.taken_on}{photo.description?` · ${photo.description}`:""}</figcaption>
  </figure>;
}
