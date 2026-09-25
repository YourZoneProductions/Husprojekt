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

type HouseAppProps = {
  floors: Floor[];
};

export default function HouseApp({ floors }: HouseAppProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

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

  function showOverview() {
    setSelectedRoom(null);
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)]">

      {/* SIDEBAR */}
      <aside className="w-72 shrink-0 border-r border-slate-200 bg-white p-5">

        <button
          onClick={showOverview}
          className={`mb-6 w-full rounded-lg px-4 py-3 text-left text-sm font-medium ${
            selectedRoom === null
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Overblik
        </button>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Etager
        </p>

        <div className="space-y-3">
          {floors.map((floor) => {
            const isOpen = openFloors.includes(floor.id);

            return (
              <div key={floor.id}>

                <button
                  onClick={() => toggleFloor(floor.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 font-semibold text-slate-800">
                    <span className="text-slate-400">
                      {isOpen ? "▼" : "▶"}
                    </span>

                    {floor.name}
                  </span>

                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                    {floor.rooms?.length ?? 0}
                  </span>
                </button>

                {isOpen && (
                  <div className="ml-3 border-l border-slate-200 pl-2">
                    {[...(floor.rooms ?? [])]
                      .sort((a, b) => a.name.localeCompare(b.name, "da"))
                      .map((room) => {
                        const active = selectedRoom?.id === room.id;

                        return (
                          <button
                            key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                              active
                                ? "bg-slate-200 font-medium text-slate-900"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <span>{room.name}</span>

                            {room.area_m2 !== null && (
                              <span className="text-xs text-slate-400">
                                {room.area_m2.toLocaleString("da-DK")} m²
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

      {/* INDHOLD */}
      <main className="flex-1 bg-slate-50 p-8">

        {selectedRoom === null ? (
          <>
            <p className="text-sm text-slate-500">Overblik</p>

            <h2 className="text-3xl font-bold text-slate-900">
              Velkommen til Husprojekt
            </h2>

            <p className="mt-2 text-slate-500">
              Her får du samlet overblik over husets projekter, økonomi og tidsplan.
            </p>

            <div className="mt-8 grid grid-cols-4 gap-4">
              <StatCard title="Aktive projekter" value="0" />
              <StatCard title="Budget" value="0 kr." />
              <StatCard title="Forbrugt" value="0 kr." />
              <StatCard
                title="Rum"
                value={String(
                  floors.reduce(
                    (total, floor) => total + (floor.rooms?.length ?? 0),
                    0
                  )
                )}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">

              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">Huset</p>
                <h3 className="text-xl font-semibold">Plantegning</h3>

                <div className="mt-5 flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                  <div className="text-center">
                    <p className="font-medium text-slate-600">
                      Plantegning kommer her
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Senere gør vi rummene klikbare
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">Projekter</p>
                <h3 className="text-xl font-semibold">Aktuelle projekter</h3>

                <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center">
                  <p className="font-medium text-slate-700">
                    Ingen aktive projekter endnu
                  </p>

                  <button className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                    + Nyt projekt
                  </button>
                </div>
              </section>

            </div>
          </>
        ) : (
          <RoomView room={selectedRoom} />
        )}

      </main>

    </div>
  );
}

function RoomView({ room }: { room: Room }) {
  return (
    <>
      <p className="text-sm text-slate-500">Rum</p>

      <div className="mt-1 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {room.name}
          </h2>

          {room.area_m2 !== null && (
            <p className="mt-2 text-slate-500">
              {room.area_m2.toLocaleString("da-DK")} m²
            </p>
          )}
        </div>

        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          + Nyt projekt
        </button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <StatCard title="Aktive projekter" value="0" />
        <StatCard title="Budget" value="0 kr." />
        <StatCard title="Forbrugt" value="0 kr." />
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Projekter</p>

        <h3 className="text-xl font-semibold text-slate-900">
          Projekter i {room.name}
        </h3>

        <div className="mt-5 rounded-xl bg-slate-50 p-10 text-center">
          <p className="font-medium text-slate-700">
            Ingen projekter i dette rum endnu
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Opret det første projekt og begynd planlægningen.
          </p>

          <button className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            + Nyt projekt
          </button>
        </div>
      </section>
    </>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}