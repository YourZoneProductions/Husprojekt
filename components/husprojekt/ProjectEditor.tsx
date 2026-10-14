"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "./HouseApp";

type Details = Pick<Project, "id" | "name" | "budget" | "status" | "expected_start" | "expected_end">;

export default function ProjectEditor({ project, onSaved, onCancel }: {
  project: Project;
  onSaved: (details: Details) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [budget, setBudget] = useState(String(project.budget ?? 0));
  const [status, setStatus] = useState(project.status);
  const [start, setStart] = useState(project.expected_start ?? "");
  const [end, setEnd] = useState(project.expected_end ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const amount = Number(budget);
    if (!name.trim()) return setError("Skriv et projektnavn.");
    if (!Number.isFinite(amount) || amount < 0) return setError("Budgettet skal være et positivt beløb eller nul.");
    if (start && end && end < start) return setError("Slutdato må ikke ligge før startdato.");
    setSaving(true);
    setError("");
    try {
      const { data, error } = await createClient().from("projects").update({
        name: name.trim(), budget: amount, status,
        expected_start: start || null, expected_end: end || null,
      }).eq("id", project.id).select("id,name,budget,status,expected_start,expected_end").single();
      if (error || !data) throw error ?? new Error("Projektet blev ikke gemt.");
      onSaved(data);
    } catch {
      setError("Projektet kunne ikke gemmes. Kontrollér forbindelsen, og prøv igen. Dine indtastninger er bevaret.");
    } finally {
      setSaving(false);
    }
  }

  const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900";
  return <form onSubmit={save} className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <h3 className="text-lg font-semibold text-slate-900">Rediger projekt</h3>
    <fieldset disabled={saving} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-700 sm:col-span-2">Projektnavn
        <input className={input} value={name} onChange={e => setName(e.target.value)} required />
      </label>
      <label className="text-sm text-slate-700">Budget i kr.
        <input className={input} type="number" min="0" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} required />
      </label>
      <label className="text-sm text-slate-700">Status
        <select className={input} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="active">Aktiv</option>
          <option value="completed">Afsluttet</option>
          {!["active", "completed"].includes(project.status) && <option value={project.status}>{project.status}</option>}
        </select>
      </label>
      <label className="text-sm text-slate-700">Startdato
        <input className={input} type="date" value={start} onChange={e => setStart(e.target.value)} />
      </label>
      <label className="text-sm text-slate-700">Slutdato
        <input className={input} type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} />
      </label>
    </fieldset>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-3">
      <button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Annuller</button>
      <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Gemmer…" : "Gem projekt"}</button>
    </div>
  </form>;
}
