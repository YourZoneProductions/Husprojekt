"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FLOOR_PLAN_BUCKET, validateFloorPlanFile } from "@/lib/floor-plan-files";

type Plan = { id: string; floor_id: string; file_path: string | null; created_at: string };
type Floor = { id: string; name: string };

export default function FloorPlanPanel({ floors }: { floors: Floor[] }) {
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "");
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <h3 className="text-xl font-semibold text-slate-900">Plantegning</h3>
    {floors.length ? <>
      <label className="mt-4 block text-sm font-medium text-slate-700">Etage
        <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base" value={floorId} onChange={event => setFloorId(event.target.value)}>
          {floors.map(floor => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
        </select>
      </label>
      <FloorPlans key={floorId} floorId={floorId} />
    </> : <p className="mt-4 text-sm text-slate-600">Der skal være en etage, før du kan tilføje en plantegning.</p>}
  </section>;
}

function FloorPlans({ floorId }: { floorId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const uploadLock = useRef(false);
  const loadGeneration = useRef(0);

  useEffect(() => {
    alive.current = true;
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError("");
    async function load() {
      try {
        const { data, error } = await createClient().from("floor_plans")
          .select("id,floor_id,file_path,created_at").eq("floor_id", floorId)
          .order("created_at", { ascending: false }).order("id", { ascending: false });
        if (error) throw error;
        if (alive.current && generation === loadGeneration.current) {
          const loaded = (data ?? []) as Plan[];
          setPlans(loaded);
          setSelectedId(current => loaded.some(plan => plan.id === current) ? current : loaded[0]?.id ?? "");
        }
      } catch {
        if (alive.current && generation === loadGeneration.current) setError("Plantegningerne kunne ikke hentes. Prøv igen.");
      } finally {
        if (alive.current && generation === loadGeneration.current) setLoading(false);
      }
    }
    void load();
    return () => { alive.current = false; };
  }, [floorId, retry]);

  async function upload(file: File) {
    if (uploadLock.current) return;
    uploadLock.current = true;
    setUploading(true);
    setError("");
    setNotice("");
    const supabase = createClient();
    let uploadedPath: string | null = null;
    let metadataSaved = false;
    try {
      const extension = await validateFloorPlanFile(file);
      const path = `${floorId}/${crypto.randomUUID()}.${extension}`;
      const result = await supabase.storage.from(FLOOR_PLAN_BUCKET).upload(path, file, {
        contentType: file.type, upsert: false, cacheControl: "0",
      });
      if (result.error) throw new Error("Billedet kunne ikke uploades. Kontrollér forbindelsen, og prøv igen.");
      uploadedPath = path;
      const { data, error } = await supabase.from("floor_plans")
        .insert({ floor_id: floorId, file_path: path })
        .select("id,floor_id,file_path,created_at").single();
      if (error || !data) throw new Error("Uploaden kunne ikke gemmes som plantegning. Prøv igen.");
      metadataSaved = true;
      if (alive.current) {
        // Invalidate an older pending list request before adding the new version.
        loadGeneration.current++;
        setPlans(current => [data as Plan, ...current.filter(plan => plan.id !== data.id)]);
        setSelectedId(data.id);
        setNotice("Plantegningen er gemt. Tidligere versioner og rummenes data er bevaret.");
      }
    } catch (failure) {
      if (uploadedPath && !metadataSaved) {
        try {
          const cleanup = await supabase.storage.from(FLOOR_PLAN_BUCKET).remove([uploadedPath]);
          if (cleanup.error) throw cleanup.error;
        } catch {
          if (alive.current) setNotice("Et billede kan være uploadet uden at være tilknyttet etagen. Tidligere tegninger er bevaret.");
        }
      }
      if (alive.current) setError(failure instanceof Error ? failure.message : "Upload mislykkedes. Prøv igen.");
    } finally {
      uploadLock.current = false;
      if (alive.current) {
        setLoading(false);
        setUploading(false);
        if (input.current) input.current.value = "";
      }
    }
  }

  const selected = plans.find(plan => plan.id === selectedId);
  return <div className="mt-4 space-y-4" aria-busy={loading || uploading}>
    <p className="text-sm text-slate-600">Upload PNG, JPG eller WebP, højst 10 MB. Tegningen er privat for husets medlemmer.</p>
    <label className="block text-sm font-medium text-slate-700">{plans.length ? "Tilføj ny version" : "Vælg plantegning"}
      <input ref={input} aria-label="Upload plantegning" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading || loading} className="mt-2 block w-full min-w-0 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:text-white disabled:opacity-50" onChange={event => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
      }} />
    </label>
    {loading && <p role="status" className="text-sm text-slate-600">Henter plantegninger…</p>}
    {uploading && <p role="status" className="text-sm text-slate-600">Uploader og gemmer…</p>}
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><p>{error}</p><button type="button" disabled={uploading} onClick={() => setRetry(value => value + 1)} className="mt-2 underline">Hent listen igen</button></div>}
    {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    {!loading && !plans.length && !error && <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">Ingen plantegning på denne etage endnu.</div>}
    {plans.length > 0 && <label className="block text-sm font-medium text-slate-700">Gemte versioner
      <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base" value={selectedId} onChange={event => setSelectedId(event.target.value)}>
        {plans.map((plan, index) => <option key={plan.id} value={plan.id}>{index === 0 ? "Nyeste" : `Tidligere version ${plans.length - index}`} · {new Date(plan.created_at).toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}</option>)}
      </select>
    </label>}
    {selected && <PlanImage key={selected.id} plan={selected} />}
    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Automatisk rumgenkendelse er ikke tilkoblet endnu. Upload ændrer ikke dine rum, m² eller projekter.</p>
  </div>;
}

function PlanImage({ plan }: { plan: Plan }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);
  const [retry, setRetry] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const reload = useCallback(() => setRetry(value => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setError("");
    setImage("");
    setImageLoading(true);
    async function download() {
      try {
        if (!plan.file_path || !plan.file_path.startsWith(`${plan.floor_id}/`)) throw new Error("Tegningen har ingen gyldig privat filreference.");
        const { data, error } = await createClient().storage.from(FLOOR_PLAN_BUCKET).download(plan.file_path);
        if (error || !data) throw new Error("Tegningen kunne ikke hentes. Kontrollér forbindelsen, og prøv igen.");
        if (!cancelled) {
          objectUrl = URL.createObjectURL(data);
          setImage(objectUrl);
        }
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Tegningen kunne ikke vises.");
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    }
    void download();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [plan.file_path, plan.floor_id, retry]);

  if (error) return <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}<button type="button" onClick={reload} className="ml-3 underline">Prøv igen</button></div>;
  if (imageLoading || !image) return <p role="status" className="text-sm text-slate-600">Henter billedet…</p>;
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" aria-label="Zoom ud" disabled={zoom <= 50} onClick={() => setZoom(value => Math.max(50, value - 25))} className="rounded-lg border px-3 py-2 disabled:opacity-40">−</button>
      <span aria-live="polite">{zoom} %</span>
      <button type="button" aria-label="Zoom ind" disabled={zoom >= 300} onClick={() => setZoom(value => Math.min(300, value + 25))} className="rounded-lg border px-3 py-2 disabled:opacity-40">+</button>
      <button type="button" onClick={() => setZoom(100)} className="rounded-lg border px-3 py-2">Tilpas bredde</button>
      <a href={image} download={`plantegning.${plan.file_path?.split(".").pop() ?? "png"}`} className="ml-auto underline">Download</a>
    </div>
    <div tabIndex={0} role="region" aria-label="Plantegning med zoom og rulning" className="max-h-[32rem] w-full overflow-auto rounded-lg border border-slate-200 bg-slate-100">
      <div style={{ width: `${zoom}%` }}>
        {/* Authenticated blob URL; never expose a public Storage URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Gemt plantegning for den valgte etage" className="block h-auto w-full max-w-none" onError={() => setError("Billedet kan ikke vises. Eksportér tegningen som PNG eller JPG, og upload en ny version.")} />
      </div>
    </div>
  </div>;
}
