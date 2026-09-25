"use client";

import { useState } from "react";

type Room = {
  id: string;
  name: string;
  area_m2: number | null;
};

type Floor = {
  id: string;
  name: string;
  rooms: Room[];
};

type SidebarProps = {
  floors: Floor[];
};

export default function Sidebar({ floors }: SidebarProps) {
  const [openFloors, setOpenFloors] = useState<string[]>(
    floors.length > 0 ? [floors[0].id] : []
  );

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  function toggleFloor(floorId: string) {
    setOpenFloors((current) =>
      current.includes(floorId)
        ? current.filter((id) => id !== floorId)
        : [...current, floorId]
    );
  }

  return (
    <aside className="min-h-[calc(100vh-73px)] w-72 border-r bg-white p-5">
      <button
        onClick={() => setSelectedRoom(null)}
        className={`mb-6 w-full rounded-lg px-4 py-3 text-left font-medium transition ${
          selectedRoom === null
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        Overblik
      </button>

      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Etager
      </div>

      <div className="space-y-3">
        {floors.map((floor) => {
          const isOpen = openFloors.includes(floor.id);

          return (
            <div key={floor.id}>
              <button
                onClick={() => toggleFloor(floor.id)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 text-xs text-slate-400">
                    {isOpen ? "▼" : "▶"}
                  </span>

                  {floor.name}
                </span>

                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                  {floor.rooms?.length ?? 0}
                </span>
              </button>

              {isOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-3">
                  {[...(floor.rooms ?? [])]
                    .sort((a, b) => a.name.localeCompare(b.name, "da"))
                    .map((room) => {
                      const isSelected = selectedRoom?.id === room.id;

                      return (
                        <button
                          key={room.id}
                          onClick={() => setSelectedRoom(room)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                            isSelected
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span className="truncate">{room.name}</span>

                          {room.area_m2 != null && (
                            <span
                              className={`ml-2 whitespace-nowrap text-xs ${
                                isSelected
                                  ? "text-slate-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {Number(room.area_m2).toLocaleString("da-DK")} m²
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}