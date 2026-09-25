"use client";

import { useState } from "react";

type Room = {
  id: string;
  name: string;
  area: number | null;
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

  function toggleFloor(floorId: string) {
    setOpenFloors((current) =>
      current.includes(floorId)
        ? current.filter((id) => id !== floorId)
        : [...current, floorId]
    );
  }

  return (
    <aside className="w-72 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="px-6 py-6 border-b border-slate-700">
        <div className="text-xs uppercase tracking-widest text-slate-400">
          Mit hjem
        </div>

        <h1 className="text-2xl font-bold mt-1">HusProjekt</h1>
      </div>

      <nav className="flex-1 px-3 py-5">
        <button className="w-full text-left px-4 py-3 mb-4 rounded-lg bg-slate-800 font-medium">
          🏠 &nbsp; Overblik
        </button>

        <div className="text-xs uppercase tracking-wider text-slate-500 px-4 mb-2">
          Etager & rum
        </div>

        {floors.map((floor) => {
          const isOpen = openFloors.includes(floor.id);

          return (
            <div key={floor.id} className="mb-2">
              <button
                onClick={() => toggleFloor(floor.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-800 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">
                    {isOpen ? "▾" : "▸"}
                  </span>

                  <span className="font-semibold">{floor.name}</span>
                </div>

                <span className="text-xs text-slate-400">
                  {floor.rooms.length}
                </span>
              </button>

              {isOpen && (
                <div className="ml-5 mt-1 border-l border-slate-700">
                  {floor.rooms.map((room) => (
                    <button
                      key={room.id}
                      className="w-full flex items-center justify-between text-left pl-5 pr-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-r-lg transition"
                    >
                      <span>{room.name}</span>

                      {room.area !== null && (
                        <span className="text-xs text-slate-500 ml-2">
                          {room.area.toLocaleString("da-DK")} m²
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-6 py-5 border-t border-slate-700">
        <div className="text-xs text-slate-500">HusProjekt</div>
        <div className="text-sm text-slate-300">Bolig & renovering</div>
      </div>
    </aside>
  );
}