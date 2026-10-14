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
  const [names, setNames] = useState<Record<string, string>>({});
  const [areas, setAreas] = useState<{id: number; name: string}[]>([]);
  const nextArea = useRef(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const floorNames = [...options.filter(value => floors.includes(value)).map(value => (names[value] ?? value).trim()), ...areas.map(area => area.name.trim())];
    if (!name.trim()) return setError("Skriv navn på boligen.");
    if (!floorNames.length || floorNames.some(value => !value)) return setError("Vælg mindst én etage eller ét område, og giv alle valgte et navn.");
    if (new Set(floorNames.map(value => value.toLocaleLowerCase("da"))).size !== floorNames.length) return setError("Etager og områder skal have forskellige navne.");
    if (floorNames.length > 20) return setError("Du kan oprette op til 20 etager og områder her. Flere kan tilføjes senere.");
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
      <span className="text-sm text-slate-600">{email}</span><a href="/protected/offers" className="text-sm underline">Modtagne opgaver</a><LogoutButton />
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
          <p className="text-sm font-medium text-slate-700">Etager og områder</p>
          <p className="text-sm text-slate-500">Vælg standarder, og tilpas navnene. Tilføj fx garage, skur eller have som egne områder.</p>
          {options.map(option => <div key={option}>
            <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" aria-label={option} checked={floors.includes(option)} onChange={event => setFloors(current => event.target.checked ? [...current, option] : current.filter(value => value !== option))} />{option}
            </label>
            {floors.includes(option) && <input className={input} aria-label={`Navn på ${option}`} value={names[option] ?? option} maxLength={80} required onChange={event => setNames(current => ({...current, [option]: event.target.value}))} />}
          </div>)}
          {areas.map(area => <div key={area.id} className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">Eget område
              <input className={input} aria-label={`Navn på eget område ${area.id + 1}`} value={area.name} maxLength={80} required placeholder="Fx Garage, Skur eller Have" onChange={event => setAreas(current => current.map(value => value.id === area.id ? {...value, name: event.target.value} : value))} />
            </label>
            <button type="button" aria-label={`Fjern eget område ${area.id + 1}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => setAreas(current => current.filter(value => value.id !== area.id))}>Fjern</button>
          </div>)}
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => { const id = nextArea.current++; setAreas(current => [...current, {id, name: ""}]); }}>Tilføj eget område</button>
          <p className="text-sm text-slate-500">Du kan tilføje flere etager og områder senere.</p>
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={saving} className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-50">{saving ? "Opretter boligen…" : "Opret bolig og fortsæt"}</button>
    </form>
  </div>;
}
