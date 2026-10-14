"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
    due_date: string | null;
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  const selectedProject =
    localProjects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  function updateSubtasks(
    projectId: string,
    update: (subtasks: Project["subtasks"]) => Project["subtasks"]
  ) {
    setLocalProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? { ...project, subtasks: update(project.subtasks) }
          : project
      )
    );
  }

  const activeProjects = localProjects.filter((project) => project.status === "active");
  const totalBudget = localProjects.reduce(
    (sum, project) => sum + (project.budget ?? 0), 0
  );
  const totalSpent = localProjects.reduce(
    (sum, project) => sum + projectSpent(project), 0
  );

  const [showNewSubtask, setShowNewSubtask] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskName, setEditingSubtaskName] = useState("");
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskBudget, setEditingSubtaskBudget] = useState("");
  const [editingSubtaskActualCost, setEditingSubtaskActualCost] = useState("");
  const [editingSubtaskDueDate, setEditingSubtaskDueDate] = useState("");

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
function handleSubtaskUpdated(
  projectId: string,
  subtaskId: string,
  newStatus: string
) {
  updateSubtasks(projectId, (subtasks) => subtasks.map((subtask) =>
    subtask.id === subtaskId ? { ...subtask, status: newStatus } : subtask
  ));
}

 async function handleCreateSubtask() {
  if (!selectedProject) return;

  const name = newSubtaskName.trim();

  if (!name) return;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("subtasks")
    .insert({
      project_id: selectedProject.id,
      name: name,
    })
    .select()
    .single();

  if (error) {
    console.error("Kunne ikke oprette delopgave:", error);
    return;
  }

  updateSubtasks(selectedProject.id, (subtasks) => [...subtasks, data]);

  setNewSubtaskName("");
  setShowNewSubtask(false);
}

async function handleUpdateSubtask(
  subtaskId: string
) {
  const name = editingSubtaskName.trim();

  if (!name || !selectedProject) return;

  const supabase = createClient();

  const { error } = await supabase
    .from("subtasks")
    .update({
  name: name,
  budget: Number(editingSubtaskBudget) || 0,
  actual_cost: Number(editingSubtaskActualCost) || 0,
  due_date: editingSubtaskDueDate || null,
})
    .eq("id", subtaskId);

  if (error) {
    console.error("Kunne ikke opdatere delopgave:", error);
    return;
  }
updateSubtasks(selectedProject.id, (subtasks) => subtasks.map((subtask) =>
  subtask.id === subtaskId ? {
    ...subtask,
    name,
    budget: Number(editingSubtaskBudget) || 0,
    actual_cost: Number(editingSubtaskActualCost) || 0,
    due_date: editingSubtaskDueDate || null,
  } : subtask
));
setEditingSubtaskId(null);
}
async function handleDeleteSubtask(
  subtaskId: string
) {
  if (!selectedProject) return;

  const supabase = createClient();

  const { error } = await supabase
    .from("subtasks")
    .delete()
    .eq("id", subtaskId);

  if (error) {
    console.error("Kunne ikke slette delopgave:", error);
    return;
  }

updateSubtasks(selectedProject.id, (subtasks) => subtasks.filter((subtask) => subtask.id !== subtaskId));

setDeletingSubtaskId(null);
}
  function showOverview() {
    setSelectedRoom(null);
    setSelectedProjectId(null);
    setShowNewProject(false);
  }
const subtaskBudgetTotal =
  selectedProject?.subtasks.reduce(
    (sum, subtask) => sum + (subtask.budget ?? 0),
    0
  ) ?? 0;

const unallocatedBudget =
  (selectedProject?.budget ?? 0) - subtaskBudgetTotal;

const subtaskActualTotal = selectedProject ? projectSpent(selectedProject) : 0;

const remainingBudget =
  (selectedProject?.budget ?? 0) - subtaskActualTotal;

const completedSubtasks =
  selectedProject?.subtasks.filter(
    (subtask) => subtask.status === "completed"
  ).length ?? 0;

const totalSubtasks =
  selectedProject?.subtasks.length ?? 0;

const progressPercent =
  totalSubtasks > 0
    ? Math.round((completedSubtasks / totalSubtasks) * 100)
    : 0;

const today = new Date().toISOString().split("T")[0];

const overdueSubtasks =
  selectedProject?.subtasks.filter(
    (subtask) =>
      subtask.due_date &&
      subtask.due_date < today &&
      subtask.status !== "completed"
  ).length ?? 0;

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
  setSelectedProjectId(null);
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

        {selectedRoom === null && selectedProject === null ? (
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
  value={String(activeProjects.length)}
/>

<StatCard
  title="Budget"
  value={`${totalBudget.toLocaleString("da-DK")} kr.`}
/>

<StatCard
  title="Forbrugt"
  value={`${totalSpent.toLocaleString("da-DK")} kr.`}
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

                <div className="mt-5 space-y-3">
                  {activeProjects.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-8 text-center">
                      <p className="font-medium text-slate-700">Ingen aktive projekter endnu</p>
                      <p className="mt-2 text-sm text-slate-500">Vælg et rum i menuen for at oprette et projekt.</p>
                    </div>
                  ) : activeProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">{project.name}</span>
                      <span className="text-sm text-slate-500">{projectSpent(project).toLocaleString("da-DK")} / {(project.budget ?? 0).toLocaleString("da-DK")} kr.</span>
                    </button>
                  ))}
                </div>
              </section>

            </div>
          </>
) : selectedProject !== null ? (
  <div>
  <button
    onClick={() => setSelectedProjectId(null)}
    className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900"
  >
    ← Tilbage til {selectedRoom?.name ?? "overblik"}
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
      value={`${subtaskActualTotal.toLocaleString("da-DK")} kr.`}
    />
    <StatCard
      title={remainingBudget >= 0 ? "Tilbage" : "Over budget total"}
      value={`${Math.abs(remainingBudget).toLocaleString("da-DK")} kr.`}
      danger={remainingBudget < 0}
    />
  </div>
<p className="mt-3 text-sm text-slate-500">
  Budget på delopgaver:{" "}
  <span className="font-medium text-slate-900">
    {subtaskBudgetTotal.toLocaleString("da-DK")} kr.
  </span>
</p>
<p className="mt-1 text-sm text-slate-500">
  {unallocatedBudget >= 0 ? "Ikke fordelt: " : "Over budget: "}
  <span
  className={`font-medium ${
    unallocatedBudget < 0 ? "text-red-600" : "text-slate-900"
  }`}
>
    {Math.abs(unallocatedBudget).toLocaleString("da-DK")} kr.
  </span>
</p>
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
  <div className="flex items-center justify-between">
  <div>
    <p className="text-sm text-slate-500">Delopgaver</p>
    <div className="mb-4">
  <p className="text-sm text-slate-500">
    Fremdrift:{" "}
    <span className="font-medium text-slate-900">
      {completedSubtasks} af {totalSubtasks} delopgaver færdige ·{" "}
      {progressPercent} %
    </span>
  </p>

{overdueSubtasks > 0 && (
  <p className="mt-2 text-sm font-medium text-red-600">
    {overdueSubtasks}{" "}
    {overdueSubtasks === 1
      ? "overskredet delopgave"
      : "overskredne delopgaver"}
  </p>
)}

<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
  <div
    className="h-full rounded-full bg-slate-900 transition-all"
    style={{ width: `${progressPercent}%` }}
  />
</div>

</div>
    <h3 className="text-xl font-semibold text-slate-900">
      Projektets delopgaver
    </h3>
  </div>

  <button
    type="button"
    onClick={() => setShowNewSubtask(true)}
    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
  >
    + Ny delopgave
  </button>
</div>
{showNewSubtask && (
  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="font-medium text-slate-900">
      Ny delopgave
    </p>

    <input
      type="text"
      value={newSubtaskName}
      onChange={(event) => setNewSubtaskName(event.target.value)}
      placeholder="Navn på delopgave"
      className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
    />

    <div className="mt-3 flex justify-end gap-2">
      <button
        type="button"
        onClick={() => setShowNewSubtask(false)}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
      >
        Annuller
      </button>

      <button
        type="button"
        onClick={handleCreateSubtask}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Opret delopgave
      </button>
    </div>
  </div>
)}
  <div className="mt-5 space-y-3">
    {selectedProject.subtasks.map((subtask) => (
  <div
    key={subtask.id}
    className="rounded-xl border border-slate-200 p-4"
  >
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={subtask.status === "completed"}
        onChange={async () => {
          const supabase = createClient();

          const newStatus =
            subtask.status === "completed" ? "todo" : "completed";

          const { error } = await supabase
            .from("subtasks")
            .update({ status: newStatus })
            .eq("id", subtask.id);

          if (error) {
            alert(
              `Supabase fejl:\n${error.message}\nKode: ${error.code}\nDetaljer: ${error.details ?? "ingen"}`
            );
            return;
          }

          handleSubtaskUpdated(
            selectedProject.id,
            subtask.id,
            newStatus
          );
        }}
        className="mt-1 h-4 w-4"
      />

      <div>
        {editingSubtaskId === subtask.id ? (
          <input
            type="text"
            value={editingSubtaskName}
            onChange={(event) =>
              setEditingSubtaskName(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        ) : (
          <p className="font-medium text-slate-900">
            {subtask.name}
          </p>
        )}

        <p className="mt-1 text-sm text-slate-500">
          {subtask.status === "todo" ? "Ikke startet" : "Færdig"}
        </p>
<div className="mt-2 flex gap-4 text-sm text-slate-500">
  {editingSubtaskId === subtask.id ? (
  <span className="flex items-center gap-2">
    Budget:
    <input
      type="number"
      value={editingSubtaskBudget}
      onChange={(event) =>
        setEditingSubtaskBudget(event.target.value)
      }
      className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
    />
    kr.
  </span>
) : (
  <span>
    Budget: {(subtask.budget ?? 0).toLocaleString("da-DK")} kr.
  </span>
)}

  {editingSubtaskId === subtask.id ? (
  <span className="flex items-center gap-2">
    Faktisk:
    <input
      type="number"
      value={editingSubtaskActualCost}
      onChange={(event) =>
        setEditingSubtaskActualCost(event.target.value)
      }
      className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
    />
    kr.
  </span>
) : (
  <span>
    Faktisk: {(subtask.actual_cost ?? 0).toLocaleString("da-DK")} kr.
  </span>
)}
{editingSubtaskId === subtask.id ? (
  <span className="flex items-center gap-2">
    Deadline:
    <input
      type="date"
      value={editingSubtaskDueDate}
      onChange={(event) =>
        setEditingSubtaskDueDate(event.target.value)
      }
      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
    />
  </span>
) : (
  <span>
    Deadline:{" "}
{subtask.due_date
  ? new Date(`${subtask.due_date}T00:00:00`).toLocaleDateString("da-DK")
  : "Ingen"}

{subtask.due_date &&
  subtask.due_date < today &&
  subtask.status !== "completed" && (
    <strong className="ml-2 text-red-600">
      Overskredet
    </strong>
  )}
{subtask.due_date &&
  subtask.due_date === today &&
  subtask.status !== "completed" && (
    <strong className="ml-2 text-amber-600">
      I dag
    </strong>
  )}
  </span>
)}
</div>
      </div>

      {editingSubtaskId === subtask.id ? (
        <div className="ml-auto flex gap-3">
          <button
            type="button"
            onClick={() => handleUpdateSubtask(subtask.id)}
            className="text-sm font-medium text-slate-900 hover:text-slate-600"
          >
            Gem
          </button>

          <button
            type="button"
            onClick={() => setEditingSubtaskId(null)}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Annuller
          </button>
        </div>
      ) : (
      <>
        <div className="ml-auto flex gap-3">
  <button
    type="button"
    onClick={() => {
      setEditingSubtaskId(subtask.id);
      setEditingSubtaskName(subtask.name);
      setEditingSubtaskBudget(String(subtask.budget ?? 0));
      setEditingSubtaskActualCost(String(subtask.actual_cost ?? 0));
      setEditingSubtaskDueDate(subtask.due_date ?? "");
    }}
    className="text-sm font-medium text-slate-500 hover:text-slate-900"
  >
    Rediger
  </button>

  <button
    type="button"
    onClick={() => setDeletingSubtaskId(subtask.id)}
    className="text-sm font-medium text-slate-500 hover:text-slate-900"
  >
    Slet
  </button>
</div>
{deletingSubtaskId === subtask.id && (
  <div className="mt-3 text-sm">
    <p className="text-slate-600">
      Er du sikker på, at du vil slette denne delopgave?
    </p>

    <div className="mt-2 flex gap-3">
      <button
        type="button"
        onClick={() => handleDeleteSubtask(subtask.id)}
        className="font-medium text-slate-900"
      >
        Ja, slet
      </button>

      <button
        type="button"
        onClick={() => setDeletingSubtaskId(null)}
        className="text-slate-500 hover:text-slate-900"
      >
        Annuller
      </button>
    </div>
  </div>
)}
</>
      )}
    </div>
  </div>
))}
</div>
</section>
</div>
) : (
  <RoomView
    room={selectedRoom!}
    projects={localProjects}
    onNewProject={() => setShowNewProject(true)}
    onProjectClick={(project) => setSelectedProjectId(project.id)}
  />
)}

{showNewProject && selectedRoom && (
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

const totalBudget = roomProjects.reduce(
  (sum, project) => sum + (project.budget ?? 0),
  0
);

const totalSpent = roomProjects.reduce(
  (sum, project) => sum + projectSpent(project),
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
  danger = false,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p
  className={`mt-2 text-3xl font-bold ${
    danger ? "text-red-600" : "text-slate-900"
  }`}
>
  {value}
</p>
    </div>
  );
}
// Use the same subtask spending in the project, room and house views.
function projectSpent(project: Project) {
  return project.subtasks.reduce((sum, subtask) => sum + (subtask.actual_cost ?? 0), 0);
}
