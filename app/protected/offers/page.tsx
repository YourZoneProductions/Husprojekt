import {redirect} from "next/navigation";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {LogoutButton} from "@/components/logout-button";
import SharedQuoteInbox from "@/components/husprojekt/SharedQuoteInbox";
export default async function OffersPage(){
 const client=await createClient();const {data:{user}}=await client.auth.getUser();if(!user)redirect("/auth/login");
 const {data,error}=await client.from("quote_shares").select("id,title,description,requested_by,created_at,quote_share_assets(id,bucket,file_path,caption)").eq("recipient_email",user.email?.toLowerCase()??"").is("revoked_at",null).order("created_at",{ascending:false});
 return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-4xl"><header className="flex flex-wrap items-center justify-between gap-3"><Link href="/protected" className="text-sm underline">Til min bolig</Link><LogoutButton/></header><h1 className="mt-8 text-2xl font-bold">Modtagne opgaver</h1><p className="mt-2 break-words text-sm text-slate-600">Logget ind som {user.email}. Her vises kun pakker, der er delt med din bekræftede e-mailadresse.</p>{error?<p role="alert" className="mt-4 text-red-800">Opgaverne kunne ikke hentes. Genindlæs siden.</p>:<SharedQuoteInbox shares={data??[]}/>}</div></main>;
}
