import type { Project } from "@/components/husprojekt/HouseApp";

export type TimelineRow = { id: string; name: string; start: string | null; end: string | null; completed: boolean; kind: "project" | "deadline" };
const day = 86400000;
export function dateDay(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time / day : null;
}
export function timelineRows(projects: Project[], subtasks: boolean): TimelineRow[] {
  return projects.flatMap(project => [
    { id: `p-${project.id}`, name: project.name, start: project.expected_start, end: project.expected_end, completed: project.status === "completed", kind: "project" as const },
    ...(subtasks ? project.subtasks.map(task => ({ id: `s-${task.id}`, name: task.name, start: null, end: task.due_date, completed: task.status === "completed", kind: "deadline" as const })) : []),
  ]);
}
export function timelineStatus(row: TimelineRow, today: string) {
  if (row.completed) return "Afsluttet";
  if (dateDay(row.end) !== null && row.end! < today) return "Frist overskredet";
  if (row.end === today) return "Frist i dag";
  return "Planlagt";
}
export function timelineRange(rows: TimelineRow[], today: string) {
  const points = rows.flatMap(row => [dateDay(row.start), dateDay(row.end)]).filter((value): value is number => value !== null);
  points.push(dateDay(today)!);
  const first = Math.min(...points) - 2;
  const last = Math.max(...points) + 2;
  return { first, last, span: last - first + 1 };
}
