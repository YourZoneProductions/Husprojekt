"use client";

import { useState } from "react";

type Room = {
  id: string;
  name: string;
  area_m2: number | null;
};

type NewProjectFormProps = {
  room: Room;
  onCancel: () => void;
};

export default function NewProjectForm({
  room,
  onCancel,
}: NewProjectFormProps) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Opret projekt
          </button>
        </div>
      </div>
    </div>
  );
}