"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Room = {
  id: string;
  name: string;
  area_m2: number | null;
};

type NewProjectFormProps = {
  room: Room;
  houseId: string;
  onCancel: () => void;
};

export default function NewProjectForm({
  room,
  houseId,
  onCancel,
}: NewProjectFormProps) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

async function handleCreateProject() {
  if (!name.trim()) {
    setErrorMessage("Skriv et projektnavn.");
    return;
  }

  setIsSaving(true);
  setErrorMessage("");

  const supabase = createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      house_id: houseId,
      name: name.trim(),
      status: "active",
      budget: budget ? Number(budget) : 0,
      expected_start: startDate || null,
      expected_end: endDate || null,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error(projectError);
    setErrorMessage(
      projectError?.message ?? "Projektet kunne ikke oprettes."
    );
    setIsSaving(false);
    return;
  }

  const { error: roomError } = await supabase
    .from("project_rooms")
    .insert({
      project_id: project.id,
      room_id: room.id,
    });

  if (roomError) {
    console.error(roomError);
    setErrorMessage(
      roomError.message ?? "Projektet blev oprettet, men rummet kunne ikke tilknyttes."
    );
    setIsSaving(false);
    return;
  }

  setIsSaving(false);
  onCancel();
}
  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-6">
        <p className="text-sm text-slate-500">Nyt projekt</p>
        <h3 className="text-xl font-bold text-slate-900">
          Opret projekt i {room.name}
        </h3>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Projektnavn
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fx Nyt køkken"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Rum
          </label>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {room.name}
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Senere kan projektet tilknyttes flere rum.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Budget
          </label>

          <div className="relative">
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-12 text-sm outline-none focus:border-slate-500"
            />
            <span className="absolute right-3 top-2 text-sm text-slate-500">
              kr.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Forventet start
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Forventet afslutning
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
        </div>

{errorMessage && (
  <p className="text-sm text-red-600">
    {errorMessage}
  </p>
)}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuller
          </button>

          <button
  type="button"
  onClick={handleCreateProject}
  disabled={isSaving}
  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
  {isSaving ? "Opretter..." : "Opret projekt"}
</button>
        </div>
      </div>
    </div>
  );
}