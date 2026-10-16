"use client";
import {useEffect,useRef,useState} from "react";
import QuoteResponses from "./QuoteResponses";
import {createClient} from "@/lib/supabase/client";
type Share={id:string;recipient_email:string;created_at:string;revoked_at:string|null};
export default function QuoteAccess({taskId,onSave}:{taskId:string;onSave:()=>Promise<boolean>}){
 const [recipient,setRecipient]=useState("");const [shares,setShares]=useState<Share[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");const [retry,setRetry]=useState(0);const lock=useRef(false);
 useEffect(()=>{let cancelled=false;async function load(){try{const {data,error}=await createClient().from("quote_shares").select("id,recipient_email,created_at,revoked_at").eq("subtask_id",taskId).order("created_at",{ascending:false});if(error)throw error;if(!cancelled)setShares(data??[]);}catch{if(!cancelled)setError("Adgangslisten kunne ikke hentes.");}}void load();return ()=>{cancelled=true;};},[taskId,retry]);
 async function grant(){if(lock.current)return;const email=recipient.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setError("Skriv modtagerens e-mailadresse.");lock.current=true;setBusy(true);setError("");setNotice("");try{
  if(!await onSave())throw new Error("Kladden skal kunne gemmes, før adgang kan gives.");
  const {data,error}=await createClient().rpc("create_quote_share",{task_id:taskId,recipient:email});if(error||!data)throw new Error("Adgang kunne ikke oprettes. Kontrollér kladden og bilagene.");setRetry(value=>value+1);setNotice("Adgang er oprettet til denne version. Ingen mail er sendt. Modtageren skal logge ind med den valgte, bekræftede e-mail og have adgang til testsiden.");
 }catch(failure){setError(failure instanceof Error?failure.message:"Adgang kunne ikke oprettes.");}finally{setBusy(false);lock.current=false;}}
 async function revoke(id:string){if(lock.current)return;lock.current=true;setBusy(true);setError("");setNotice("");try{const {error}=await createClient().rpc("revoke_quote_share",{target_share:id});if(error)throw error;setRetry(value=>value+1);setNotice("Adgangen er tilbagekaldt. Allerede hentede kopier kan ikke trækkes tilbage.");}catch{setError("Adgangen kunne ikke tilbagekaldes. Prøv igen.");}finally{lock.current=false;setBusy(false);}}
 return <section className="mt-5 space-y-3 rounded-lg border border-slate-300 p-4" aria-label="Modtageradgang">
  <h4 className="font-semibold">Giv adgang til denne tilbudspakke</h4>
  <p className="text-sm text-slate-600">Gemmer den viste kladde og opretter en fast version til den valgte e-mail. Senere ændringer i kladden ændrer ikke den delte version. Modtageren får kun teksten og de valgte bilag.</p>
  <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">Testsiden er privat for dig. En ekstern modtager kan derfor endnu ikke åbne siden uden særskilt Sites-adgang. Denne knap sender ingen invitation eller e-mail.</p>
  <label className="block text-sm font-medium">Modtagerens e-mail<input aria-label="Tilbudsmodtagerens e-mail" type="email" maxLength={254} disabled={busy} value={recipient} onChange={event=>setRecipient(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"/></label>
  <button type="button" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white disabled:opacity-50" onClick={()=>void grant()}>{busy?"Behandler…":"Gem og giv adgang til valgt modtager"}</button>
  {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}{notice&&<p role="status" className="text-sm text-emerald-800">{notice}</p>}
  <p className="text-sm">Modtageren finder pakken under <a className="underline" href="/protected/offers">Modtagne opgaver</a>.</p>
  {shares.map(share=><div key={share.id} className="space-y-3 rounded border p-3 text-sm"><span className="min-w-0 break-words">{share.recipient_email} · {new Date(share.created_at).toLocaleString("da-DK",{timeZone:"Europe/Copenhagen"})} · {share.revoked_at?"Tilbagekaldt":"Aktiv"}</span>{!share.revoked_at&&<button type="button" disabled={busy} className="rounded border px-3 py-2" onClick={()=>void revoke(share.id)}>Tilbagekald adgang</button>}<QuoteResponses shareId={share.id}/></div>)}
 </section>;
}
