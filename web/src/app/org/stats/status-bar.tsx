"use client";

import { useState } from "react";
import { List } from "lucide-react";

export interface StatusSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

// A legend is always present for >=2 series -- the dependable identity
// channel, since two of these three colors (blue/gray) sit close enough
// under some CVD profiles that color alone isn't reliable; the label next
// to every swatch (and on the bar itself, via hover) is the mitigation.
export function StatusBar({ segments }: { segments: StatusSegment[] }) {
  const [tableView, setTableView] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      {tableView ? (
        <div>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-800">
              {segments.map((s) => (
                <tr key={s.id}>
                  <td className="py-1 pr-3 text-slate-300">{s.label}</td>
                  <td className="py-1 text-right font-medium text-slate-100">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setTableView((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
          >
            <List size={10} />
            Graphique
          </button>
        </div>
      ) : (
        <>
          <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-slate-800">
            {segments.map((s) => {
              const pct = total > 0 ? (s.value / total) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={s.id}
                  onMouseEnter={() => setHoveredId(s.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="h-full transition-[filter] first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: s.color,
                    filter: hoveredId === s.id ? "brightness(1.25)" : undefined,
                  }}
                  title={`${s.label} — ${s.value}`}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {segments.map((s) => (
                <div
                  key={s.id}
                  onMouseEnter={() => setHoveredId(s.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="flex items-center gap-1 text-[11px]"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-300">{s.label}</span>
                  <span className="font-medium text-slate-100">{s.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setTableView((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
            >
              <List size={10} />
              Tableau
            </button>
          </div>
        </>
      )}
    </div>
  );
}
