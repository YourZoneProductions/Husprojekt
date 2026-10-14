"use client";
import {useState} from "react";
import {QuoteAttachment} from "./QuoteDraft";
type Share={id:string;title:string;description:string;requested_by:string|null;created_at:string;quote_share_assets:{id:string;bucket:string;file_path:string;caption:string}[]};
export default function SharedQuoteInbox({shares}:{shares:Share[]}){
 const [selected,setSelected]=useState<string|null>(null);const share=shares.find(value=>value.id===selected);
 return <div className="mt-6 space-y-4"><p className="rounded-lg bg-white p-4 text-sm text-slate-600">Du kan læse opgaven og valgte bilag. Afgivelse af tilbud og beskeder er næste del. Adgang kan tilbagekaldes af ejeren; genindlæs siden for aktuel status.</p>{!shares.length&&<p className="text-sm text-slate-600">Ingen aktive opgaver delt med denne konto.</p>}
 {shares.map(value=><button key={value.id} type="button" className="block w-full rounded-lg border bg-white p-4 text-left" onClick={()=>setSelected(value.id)}><span className="font-medium">{value.title}</span><span className="mt-1 block text-xs text-slate-500">Delt {new Date(value.created_at).toLocaleString("da-DK",{timeZone:"Europe/Copenhagen"})}</span></button>)}
 {share&&<article className="space-y-4 rounded-xl border bg-white p-4 sm:p-6"><h2 className="break-words text-xl font-semibold">{share.title}</h2><p className="whitespace-pre-wrap break-words text-sm">{share.description}</p><p className="text-sm">Ønsket afslutning: {share.requested_by||"Efter aftale"}</p>{share.quote_share_assets.map(asset=><QuoteAttachment key={asset.id} bucket={asset.bucket} path={asset.file_path} prefix={asset.file_path.split('/')[0]} label={asset.caption}/>)}</article>}
 </div>;
}
