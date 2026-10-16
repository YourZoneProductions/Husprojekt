"use client";

import type { Project } from "./HouseApp";
import { dateDay, timelineRange, timelineRows, timelineStatus } from "@/lib/timeline";

const format = (value: string) => new Date(value + "T00:00:00Z").toLocaleDateString("da-DK", {timeZone:"UTC", day:"numeric",month:"short",year:"numeric"});
const dayString = (value: number) => new Date(value * 86400000).toISOString().slice(0,10);

export default function ProjectTimeline({projects, showSubtasks = false, today}: {projects: Project[]; showSubtasks?: boolean; today: string}) {
  const rows = timelineRows(projects, showSubtasks);
  const range = timelineRange(rows, today);
  const position = (value: number) => (value - range.first) / range.span * 100;
  const todayPosition = position(dateDay(today)!);
  return <section className="mt-6 min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-label={showSubtasks ? "Projektets Gantt-tidsplan" : "Samlet Gantt-tidsplan"}>
    <h3 className="text-lg font-semibold text-slate-900">{showSubtasks ? "Projektets tidslinje" : "Samlet tidslinje"}</h3>
    <p className="mt-2 text-sm text-slate-600">Bjælker viser projektperioder. ◆ viser en frist. Rød betyder overskredet, gul frist i dag og grøn afsluttet.</p>
    {showSubtasks && <p className="mt-1 text-sm text-slate-500">Delopgaver har foreløbig kun en frist og vises derfor som punkter uden en antaget varighed. Ret datoerne i de eksisterende formularer.</p>}
    {!rows.length ? <p className="mt-4 text-sm text-slate-500">Opret et projekt for at se tidsplanen.</p> : <>
      <p className="mt-3 text-xs text-slate-500">I dag: {format(today)}. Rul vandret på en lille skærm. Datoer og status står også på hver række.</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} role="region" aria-label="Tidslinje, rul vandret">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[240px_minmax(0,1fr)] bg-slate-50">
            <div className="p-3 text-sm font-medium">Projekt / delopgave</div>
            <div className="relative h-14 border-l border-slate-200">
              {Array.from({length:5},(_,index) => {const point=range.first + Math.round((range.last-range.first)*index/4);return <span key={index} className="absolute top-2 whitespace-nowrap text-[10px] text-slate-600" style={{left:`${index*25}%`,transform:index===4?"translateX(-100%)":index===0?undefined:"translateX(-50%)"}}>{format(dayString(point))}</span>;})}
              <span className="absolute bottom-0 text-[10px] font-medium text-slate-700" style={{left:`${todayPosition}%`,transform:"translateX(-50%)"}}>I dag</span>
            </div>
          </div>
          {rows.map(row => {
            const start=dateDay(row.start),end=dateDay(row.end);
            const invalid=start!==null && end!==null && end<start;
            const status=timelineStatus(row,today);
            const color=row.completed?"bg-emerald-600":status==="Frist overskredet"?"bg-red-600":status==="Frist i dag"?"bg-amber-500":"bg-slate-600";
            const period=row.kind==="project" && start!==null && end!==null && !invalid;
            const point=end??start;
            const dates=invalid?"Slutdato ligger før startdato":period?`${format(row.start!)} – ${format(row.end!)}`:end!==null?`Frist: ${format(row.end!)}`:start!==null?`Start: ${format(row.start!)}, slut mangler`:"Dato mangler";
            return <div key={row.id} className="grid grid-cols-[240px_minmax(0,1fr)] border-t border-slate-200">
              <div className={`p-3 ${row.kind==="deadline"?"pl-6":""}`}>
                <p className="break-words text-sm font-medium text-slate-900">{row.name}</p>
                <p className="mt-1 text-xs text-slate-500">{dates}</p>
                <p className={`mt-1 text-xs ${status==="Frist overskredet"?"font-semibold text-red-700":"text-slate-600"}`}>{status}</p>
              </div>
              <div className="relative min-h-24 border-l border-slate-200" aria-label={`${row.name}: ${dates}. ${status}`}>
                {[0,25,50,75].map(left=><span key={left} className="absolute inset-y-0 border-l border-slate-100" style={{left:`${left}%`}} />)}
                <span className="absolute inset-y-0 z-10 border-l-2 border-dashed border-slate-400" style={{left:`${todayPosition}%`}} />
                {invalid || point===null ? <span className="absolute left-3 top-8 text-xs text-slate-500">{invalid?"Kontrollér datoerne":"Ingen dato angivet"}</span> : period ? <>
                  <span className={`absolute top-9 h-5 rounded ${color}`} style={{left:`${position(start!)}%`,width:`${(end!-start!+1)/range.span*100}%`,minWidth:4}} />
                  {status==="Frist overskredet" && <span className="absolute top-9 h-5 border-y-2 border-dashed border-red-500 bg-red-50" title="Tid efter planlagt afslutning" style={{left:`${position(end!+1)}%`,width:`${Math.max(0,(dateDay(today)!-end!-1)/range.span*100)}%`}} />}
                </> : <span className={`absolute top-8 -translate-x-1/2 rounded px-1 text-sm text-white ${color}`} style={{left:`${position(point)}%`}}>◆</span>}
              </div>
            </div>;
          })}
        </div>
      </div>
    </>}
  </section>;
}
