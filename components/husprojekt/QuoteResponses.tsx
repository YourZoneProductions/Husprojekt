"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {responseValues,type QuoteResponseDraft} from "@/lib/quote-response";

type Response={id:string;amount_dkk:number;price_type:string;scope:string;reservations:string;proposed_start:string|null;proposed_end:string|null;created_at:string};
const fields="id,amount_dkk,price_type,scope,reservations,proposed_start,proposed_end,created_at";
const money=(value:number)=>Number(value).toLocaleString("da-DK",{style:"currency",currency:"DKK"});
const date=(value:string|null)=>value?new Date(`${value}T00:00:00Z`).toLocaleDateString("da-DK",{timeZone:"UTC"}):"Efter aftale";
const initial:QuoteResponseDraft={amount:"",priceType:"fixed",scope:"",reservations:"",start:"",end:""};

export default function QuoteResponses({shareId,canRespond=false}:{shareId:string;canRespond?:boolean}){
 const [responses,setResponses]=useState<Response[]>([]),[draft,setDraft]=useState(initial);
 const [loading,setLoading]=useState(true),[ready,setReady]=useState(false),[saving,setSaving]=useState(false),[preview,setPreview]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[retry,setRetry]=useState(0);
 const lock=useRef(false),alive=useRef(true),submissionId=useRef<string|null>(null);
 useEffect(()=>{let cancelled=false;alive.current=true;setLoading(true);setReady(false);setError("");
  async function load(){try{
   const {data,error}=await createClient().from("quote_responses").select(fields).eq("share_id",shareId).order("created_at",{ascending:false}).order("id",{ascending:false});
   if(error)throw error;if(!cancelled){setResponses(data??[]);setReady(true);}
  }catch{if(!cancelled)setError("Tilbuddene kunne ikke hentes. Prøv igen.");}finally{if(!cancelled)setLoading(false);}}
  void load();return ()=>{cancelled=true;alive.current=false;};
 },[shareId,retry]);
 function change(key:keyof QuoteResponseDraft,value:string){setDraft(current=>({...current,[key]:value}));submissionId.current=null;setNotice("");}
 function review(){try{responseValues(draft);setError("");setPreview(true);}catch(failure){setError(failure instanceof Error?failure.message:"Kontrollér oplysningerne.");}}
 async function submit(){
  if(lock.current||!ready||!canRespond)return;
  let values;try{values=responseValues(draft);}catch(failure){setError(failure instanceof Error?failure.message:"Kontrollér oplysningerne.");return;}
  lock.current=true;setSaving(true);setError("");setNotice("");const id=submissionId.current??crypto.randomUUID();submissionId.current=id;
  try{
   const client=createClient();const result=await client.from("quote_responses").insert({id,share_id:shareId,...values}).select(fields).single();
   let row=result.data as Response|null;
   if(result.error?.code==="23505"){
    // A retry after a lost response uses the same UUID and never adds a duplicate.
    const previous=await client.from("quote_responses").select(fields).eq("share_id",shareId).eq("id",id).single();
    if(previous.error)throw previous.error;row=previous.data as Response;
   }else if(result.error)throw result.error;
   if(!row)throw new Error();
   if(alive.current){setResponses(current=>[row!,...current.filter(value=>value.id!==id)]);setPreview(false);setDraft(initial);submissionId.current=null;setNotice("Tilbuddet er gemt til ejeren. Der er ikke accepteret eller bestilt arbejde, og budgettet er uændret.");}
  }catch{if(alive.current)setError("Tilbuddet kunne ikke gemmes. Indtastningerne er bevaret. Adgangen kan være tilbagekaldt; genindlæs siden, eller prøv igen.");}
  finally{lock.current=false;if(alive.current)setSaving(false);}
 }
 const field="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base";
 const values=(()=>{try{return responseValues(draft);}catch{return null;}})();
 return <section className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label={canRespond?"Dit tilbud":"Modtagne tilbud"} aria-busy={loading||saving}>
  <h4 className="font-semibold">{canRespond?"Dit tilbud til ejeren":"Modtagne tilbud"}</h4>
  <p className="text-sm text-slate-600">Tilbud er knyttet til denne version af opgaven. Der sker ingen automatisk accept, bestilling eller ændring af budgettet.</p>
  {loading&&<p role="status" className="text-sm">Henter tilbud…</p>}
  {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}
  {notice&&<p role="status" className="text-sm text-emerald-800">{notice}</p>}
  <button type="button" disabled={saving||loading} onClick={()=>setRetry(value=>value+1)} className="rounded border bg-white px-3 py-2 text-sm">Hent tilbud igen</button>
  {!loading&&ready&&!responses.length&&<p className="text-sm text-slate-500">Ingen tilbud på denne version endnu.</p>}
  {responses.map((response,index)=><article key={response.id} className="space-y-2 rounded-lg border bg-white p-3">
   <p className="text-xs text-slate-500">{index===0?"Seneste tilbud":"Tidligere tilbud"} · {new Date(response.created_at).toLocaleString("da-DK",{timeZone:"Europe/Copenhagen"})}</p>
   <p className="text-lg font-semibold">{money(response.amount_dkk)} · {response.price_type==="fixed"?"Fast pris":"Prisoverslag"}</p><p className="text-xs text-slate-500">Samlet pris inkl. eventuel moms som oplyst af tilbudsgiveren.</p>
   <p className="whitespace-pre-wrap break-words text-sm"><strong>Omfatter: </strong>{response.scope}</p>
   <p className="whitespace-pre-wrap break-words text-sm"><strong>Forbehold: </strong>{response.reservations||"Ingen forbehold angivet"}</p>
   <p className="text-sm">Foreslået start: {date(response.proposed_start)} · Slut: {date(response.proposed_end)}</p>
  </article>)}
  {canRespond&&!preview&&<fieldset disabled={loading||saving||!ready} className="grid min-w-0 gap-3 sm:grid-cols-2">
   <legend className="mb-3 font-medium">{responses.length?"Afgiv et nyt tilbud":"Afgiv tilbud"}</legend>
   <label className="min-w-0 text-sm font-medium">Samlet pris inkl. eventuel moms (kr.)<input aria-label="Tilbudspris i kroner" className={field} type="text" inputMode="decimal" placeholder="Fx 12500,00" value={draft.amount} onChange={event=>change("amount",event.target.value)}/></label>
   <label className="text-sm font-medium">Pristype<select aria-label="Tilbuddets pristype" className={field} value={draft.priceType} onChange={event=>change("priceType",event.target.value)}><option value="fixed">Fast pris</option><option value="estimate">Prisoverslag</option></select></label>
   <label className="text-sm font-medium sm:col-span-2">Hvad omfatter tilbuddet?<textarea aria-label="Tilbuddets omfang" className={field} rows={3} maxLength={5000} value={draft.scope} onChange={event=>change("scope",event.target.value)}/></label>
   <label className="text-sm font-medium sm:col-span-2">Forbehold og undtagelser (valgfri)<textarea aria-label="Tilbuddets forbehold" className={field} rows={2} maxLength={3000} value={draft.reservations} onChange={event=>change("reservations",event.target.value)}/></label>
   <label className="min-w-0 text-sm font-medium">Foreslået start (valgfri)<input aria-label="Tilbuddets startdato" className={field} type="date" value={draft.start} onChange={event=>change("start",event.target.value)}/></label>
   <label className="min-w-0 text-sm font-medium">Foreslået slut (valgfri)<input aria-label="Tilbuddets slutdato" className={field} type="date" value={draft.end} onChange={event=>change("end",event.target.value)}/></label>
   <button type="button" className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white" onClick={review}>Gennemse dit tilbud</button>
  </fieldset>}
  {canRespond&&preview&&values&&<div className="space-y-3 rounded-lg border bg-white p-4">
   <h5 className="font-medium">Kontrollér tilbuddet</h5><p className="font-semibold">{money(values.amount_dkk)} · {values.price_type==="fixed"?"Fast pris":"Prisoverslag"}</p>
   <p className="whitespace-pre-wrap break-words text-sm">{values.scope}</p><p className="whitespace-pre-wrap break-words text-sm">Forbehold: {values.reservations||"Ingen angivet"}</p><p className="text-sm">Start: {date(values.proposed_start)} · Slut: {date(values.proposed_end)}</p>
   <div className="flex flex-wrap gap-3"><button type="button" disabled={saving} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>setPreview(false)}>Ret tilbuddet</button><button type="button" disabled={saving||loading||!ready} className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white" onClick={()=>void submit()}>{saving?"Gemmer tilbud…":"Gem tilbud til ejeren"}</button></div>
  </div>}
 </section>;
}
