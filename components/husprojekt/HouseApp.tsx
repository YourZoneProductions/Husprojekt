"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NewProjectForm from "./NewProjectForm";

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
type Project = {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  actual_cost: number | null;
  expected_start: string | null;
  expected_end: string | null;
  project_rooms: {
    room_id: string;
  }[];
  subtasks: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    budget: number | null;
    actual_cost: number | null;
    sort_order: number;
  }[];
};
type HouseAppProps = {
  floors: Floor[];
  houseId: string;
  projects: Project[];
};

export default function HouseApp({
  floors,
  houseId,
  projects,
}: HouseAppProps) {
  const router = useRouter();

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
function handleProjectCreated() {
  router.refresh();
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
                            onClick={() => {
  setSelectedRoom(room);
  setSelectedProject(null);
}}
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
<StatCard
  title="Aktive projekter"
  value="0"
/>

<StatCard
  title="Budget"
  value="0 kr."
/>

<StatCard
  title="Forbrugt"
  value="0 kr."
/>
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
) : selectedProject !== null ? (
  <div>
  <button
    onClick={() => setSelectedProject(null)}
    className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900"
  >
    ← Tilbage til {selectedRoom.name}
  </button>

  <p className="text-sm text-slate-500">Projekt</p>

  <div className="mt-1 flex items-center justify-between">
    <div>
      <h2 className="text-3xl font-bold text-slate-900">
        {selectedProject.name}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Status: {selectedProject.status === "active" ? "Aktiv" : selectedProject.status}
      </p>
    </div>
  </div>

  <div className="mt-8 grid grid-cols-3 gap-4">
    <StatCard
      title="Budget"
      value={`${(selectedProject.budget ?? 0).toLocaleString("da-DK")} kr.`}
    />
    <StatCard
      title="Forbrugt"
      value={`${(selectedProject.actual_cost ?? 0).toLocaleString("da-DK")} kr.`}
    />
    <StatCard
      title="Tilbage"
      value={`${((selectedProject.budget ?? 0) - (selectedProject.actual_cost ?? 0)).toLocaleString("da-DK")} kr.`}
    />
  </div>

  <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
    <p className="text-sm text-slate-500">Tidsplan</p>

    <div className="mt-4 grid grid-cols-2 gap-6">
      <div>
        <p className="text-sm text-slate-500">Startdato</p>
        <p className="mt-1 font-medium text-slate-900">
          {selectedProject.expected_start ?? "Ikke angivet"}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-500">Slutdato</p>
        <p className="mt-1 font-medium text-slate-900">
          {selectedProject.expected_end ?? "Ikke angivet"}
        </p>
      </div>
    </div>
  </section>

<section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
  <p className="text-sm text-slate-500">Delopgaver</p>
  <h3 className="text-xl font-semibold text-slate-900">
    Projektets delopgaver
  </h3>

  <div className="mt-5 space-y-3">
    {selectedProject.subtasks.map((subtask) => (
      <div
        key={subtask.id}
        className="rounded-xl border border-slate-200 p-4"
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={subtask.status === "done"}
            readOnly
            className="mt-1 h-4 w-4"
          />

          <div>
            <p className="font-medium text-slate-900">
              {subtask.name}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {subtask.status === "todo" ? "Ikke startet" : "Færdig"}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
</section>
</div>
) : (
  <RoomView
    room={selectedRoom}
    projects={projects}
    onNewProject={() => setShowNewProject(true)}
    onProjectClick={(project) => setSelectedProject(project)}
  />
)}

{showNewProject && (
  <NewProjectForm
    room={selectedRoom}
    houseId={houseId}
    onCancel={() => setShowNewProject(false)}
    onProjectCreated={handleProjectCreated}
  />
)}

      </main>

    </div>
  );
}

function RoomView({
  room,
  projects,
  onNewProject,
  onProjectClick,
}: {
  room: Room;
  projects: Project[];
  onNewProject: () => void;
  onProjectClick: (project: Project) => void;
}) {
const roomProjects = projects.filter((project) =>
  project.project_rooms?.some(
    (projectRoom) => projectRoom.room_id === room.id
  )
);

const activeProjects = roomProjects.filter(
  (project) => project.status === "active"
);

const totalBudget = activeProjects.reduce(
  (sum, project) => sum + (project.budget ?? 0),
  0
);

const totalSpent = activeProjects.reduce(
  (sum, project) => sum + (project.actual_cost ?? 0),
  0
);

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

        <button
  onClick={onNewProject}
  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
>
  + Nyt projekt
</button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
<StatCard
  title="Aktive projekter"
  value={activeProjects.length.toString()}
/>
<StatCard
  title="Budget"
  value={`${totalBudget.toLocaleString("da-DK")} kr.`}
/>
<StatCard
  title="Forbrugt"
  value={`${totalSpent.toLocaleString("da-DK")} kr.`}
/>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
  <p className="text-sm text-slate-500">Projekter</p>

  <h3 className="text-xl font-semibold text-slate-900">
    Projekter i {room.name}
  </h3>

  {roomProjects.length === 0 ? (
    <div className="mt-5 rounded-xl bg-slate-50 p-10 text-center">
      <p className="font-medium text-slate-700">
        Ingen projekter i dette rum endnu
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Opret det første projekt og begynd planlægningen.
      </p>

      <button
        className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        onClick={onNewProject}
      >
        + Nyt projekt
      </button>
    </div>
  ) : (
    <div className="mt-5 space-y-3">
      {roomProjects.map((project) => (
  <div
    key={project.id}
    onClick={() => onProjectClick(project)}
    className="cursor-pointer rounded-xl border border-slate-200 p-5 hover:bg-slate-50"
  >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-semibold text-slate-900">
                {project.name}
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                {project.status === "active" ? "Aktiv" : project.status}
              </p>
            </div>

            <p className="font-semibold text-slate-900">
              {(project.budget ?? 0).toLocaleString("da-DK")} kr.
            </p>
          </div>

          {(project.expected_start || project.expected_end) && (
            <p className="mt-4 text-sm text-slate-500">
              {project.expected_start ?? "Ingen startdato"}
              {" → "}
              {project.expected_end ?? "Ingen slutdato"}
            </p>
          )}
        </div>
      ))}

      <button
        className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        onClick={onNewProject}
      >
        + Nyt projekt
      </button>
    </div>
  )}
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