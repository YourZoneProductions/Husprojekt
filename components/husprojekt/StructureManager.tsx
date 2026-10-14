"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Floor = { id: string; name: string };

export default function StructureManager({ houseId, floors, onSaved }: {
  houseId: string; floors: Floor[]; onSaved: (floorId: string) => void;
}) {
  const [floorName, setFloorName] = useState("");
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "");
  const [roomName, setRoomName] = useState("");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    if (!floors.some(floor => floor.id === floorId)) setFloorId(floors[0]?.id ?? "");
  }, [floors, floorId]);

  async function save(kind: "floor" | "room", event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const name = (kind === "floor" ? floorName : roomName).trim();
    if (!name) return setError("Skriv et navn.");
    if (kind === "room" && !floors.some(floor => floor.id === floorId)) return setError("Vælg en etage eller et område til rummet.");
    const amount = area.trim() === "" ? null : Number(area.replace(",", "."));
    if (kind === "room" && amount !== null && (!Number.isFinite(amount) || amount <= 0)) return setError("Arealet skal være et positivt antal m², eller feltet skal være tomt.");
    lock.current = true;
    setSaving(true);setError("");setNotice("");
    try {
      const { data, error } = kind === "floor"
        ? await createClient().from("floors").insert({ house_id: houseId, name, sort_order: floors.length }).select("id").single()
        : await createClient().from("rooms").insert({ floor_id: floorId, name, area_m2: amount }).select("id").single();
      if (error || !data) throw error ?? new Error("Kunne ikke gemme");
      if (kind === "floor") { setFloorName("");setNotice("Etagen eller området er oprettet."); }
      else { setRoomName("");setArea("");setNotice("Rummet er oprettet. Du kan nu tilføje projekter i rummet."); }
      onSaved(kind === "floor" ? data.id : floorId);
    } catch {
      setError("Ændringen kunne ikke gemmes. Dine indtastninger er bevaret. Kontrollér forbindelsen, og prøv igen.");
    } finally { lock.current=false;setSaving(false); }
  }

  const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900";
  return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-busy={saving}>
    <h3 className="text-lg font-semibold text-slate-900">Etager og områder</h3>
    <p className="mt-2 text-sm text-slate-600">Tilføj dine egne rum. Areal er valgfrit og skal komme fra dine mål eller en tegning.</p>
    <div className="mt-5 grid gap-6 lg:grid-cols-2">
      <form onSubmit={event => void save("floor", event)}>
        <fieldset disabled={saving}>
          <label className="block text-sm font-medium text-slate-700">Ny etage eller nyt område
            <input className={input} value={floorName} maxLength={80} required placeholder="Fx Garage" onChange={event => setFloorName(event.target.value)} />
          </label>
          <button type="submit" className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Tilføj etage eller område</button>
        </fieldset>
      </form>
      <form onSubmit={event => void save("room", event)}>
        <fieldset disabled={saving || !floors.length} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Etage eller område til rummet
            <select className={input} value={floorId} onChange={event => setFloorId(event.target.value)} required>
              {!floors.length && <option value="">Opret en etage eller et område først</option>}
              {floors.map(floor => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Navn på nyt rum
            <input className={input} value={roomName} maxLength={120} required placeholder="Fx Køkken" onChange={event => setRoomName(event.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Areal i m² (valgfrit)
            <input className={input} type="text" inputMode="decimal" value={area} placeholder="Fx 12,5" onChange={event => setArea(event.target.value)} />
          </label>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">Tilføj rum</button>
        </fieldset>
      </form>
    </div>
    {saving && <p role="status" className="mt-4 text-sm text-slate-600">Gemmer…</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-emerald-800">{notice}</p>}
  </section>;
}
