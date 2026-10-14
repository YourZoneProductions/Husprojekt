"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/logout-button";

export default function HouseSetup({ email }: { email?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const options = ["Kælder", "Stueetage", "1. Sal", "2. Sal"];
  const [floors, setFloors] = useState<string[]>(["Stueetage"]);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const floorNames = [...options.filter(value => floors.includes(value)), ...(custom ? [customName.trim()] : [])];
    if (!name.trim()) return setError("Skriv navn på boligen.");
    if (!floorNames.length || floorNames.some(value => !value)) return setError("Vælg mindst én etage, og giv eventuelle egne etager et navn.");
    if (new Set(floorNames.map(value => value.toLocaleLowerCase("da"))).size !== floorNames.length) return setError("Etagerne skal have forskellige navne.");
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const { data, error } = await createClient().rpc("create_house_with_floors", {
        house_name: name.trim(), floor_names: floorNames,
      });
      if (error || !data) throw error ?? new Error("Oprettelse mislykkedes");
      router.refresh();
      // Keep the successful form disabled until the updated server page arrives.
    } catch {
      lock.current = false;
      setSaving(false);
      setError("Boligen kunne ikke oprettes. Prøv igen. En gentaget oprettelse laver ikke en ekstra kopi.");
    }
  }

  const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900";
  return <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
    <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-slate-600">{email}</span><LogoutButton />
    </header>
    <form onSubmit={create} className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      <p className="text-sm font-medium text-slate-500">Velkommen til Husprojekt</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Opret din bolig</h1>
      <p className="mt-3 text-sm text-slate-600">Her samler du dine egne rum, projekter og budgetter. Du starter med et tomt overblik og tilføjer selv rummene. Dine oplysninger deles ikke med andre brugere.</p>
      <fieldset disabled={saving} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">Navn på boligen
          <input className={input} value={name} maxLength={120} required placeholder="Fx Vores hus" onChange={event => setName(event.target.value)} />
        </label>
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Vælg boligens etager</p>
          {options.map(option => <label key={option} className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" aria-label={option} checked={floors.includes(option)} onChange={event => setFloors(current => event.target.checked ? [...current, option] : current.filter(value => value !== option))} />{option}
          </label>)}
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" aria-label="Etage med eget navn" checked={custom} onChange={event => setCustom(event.target.checked)} />Etage med eget navn
          </label>
          {custom && <label className="block text-sm font-medium text-slate-700">Etagenavn
            <input className={input} value={customName} maxLength={80} required placeholder="Fx 3. Sal" onChange={event => setCustomName(event.target.value)} />
          </label>}
          <p className="text-sm text-slate-500">Du kan tilføje flere etager senere.</p>
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={saving} className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-50">{saving ? "Opretter boligen…" : "Opret bolig og fortsæt"}</button>
    </form>
  </div>;
}
