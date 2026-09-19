"use client";

import { useState } from "react";
import { List } from "lucide-react";

export function PeakHoursChart({ counts, color }: { counts: number[]; color: string }) {
  const [tableView, setTableView] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="px-1 text-center text-sm italic text-slate-500">
          Aucune prise de service enregistrée sur la période.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex shrink-0 justify-end">
        <button
          onClick={() => setTableView((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
        >
          <List size={11} />
          {tableView ? "Graphique" : "Tableau"}
        </button>
      </div>

      {tableView ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-800">
              {counts.map((c, hour) => (
                <tr key={hour}>
                  <td className="py-1 pr-3 text-slate-300">
                    {hour.toString().padStart(2, "0")}h – {((hour + 1) % 24).toString().padStart(2, "0")}h
                  </td>
                  <td className="py-1 text-right font-medium text-slate-100">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {hovered != null && (
            <div
              className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white shadow-lg"
              style={{ left: `${((hovered + 0.5) / 24) * 100}%` }}
            >
              {hovered.toString().padStart(2, "0")}h — {counts[hovered]} prise(s) de service
            </div>
          )}
          <div className="flex min-h-0 flex-1 items-end gap-[3px] border-b border-slate-800">
            {counts.map((c, hour) => (
              <div
                key={hour}
                onMouseEnter={() => setHovered(hour)}
                onMouseLeave={() => setHovered(null)}
                className="group flex h-full flex-1 cursor-default flex-col justify-end"
              >
                <div
                  className="rounded-t-sm transition-[filter] group-hover:brightness-125"
                  style={{
                    height: `${Math.max((c / max) * 100, c > 0 ? 4 : 0)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex shrink-0 gap-[3px]">
            {counts.map((_, hour) => (
              <div key={hour} className="flex-1 text-center text-[10px] text-slate-500">
                {hour % 3 === 0 ? hour : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
