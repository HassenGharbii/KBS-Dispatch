"use client";

import { useState } from "react";
import { List } from "lucide-react";

export interface BarListItem {
  id: string;
  label: string;
  value: number;
}

// "format" is a serializable mode rather than a formatter function -- a
// Server Component can't pass a function prop to a Client Component, so
// formatting logic lives here instead of being handed in from the caller.
export type BarListValueFormat = "hours" | "services";

function formatValue(value: number, format: BarListValueFormat): string {
  if (format === "hours") {
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }
  return `${value} service(s)`;
}

// Nominal categories (agents, sites) have no natural order, so every bar
// takes the same single hue rather than a value-ramp -- a darker-where-bigger
// gradient would double-encode length as color for no reason (see the
// dataviz skill's anti-patterns: "a value-ramp on nominal categories").
export function BarList({
  items,
  color,
  format,
  emptyLabel,
}: {
  items: BarListItem[];
  color: string;
  format: BarListValueFormat;
  emptyLabel: string;
}) {
  const [tableView, setTableView] = useState(false);
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="px-1 text-center text-sm italic text-slate-500">{emptyLabel}</p>
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
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1 pr-3 text-slate-300">{item.label}</td>
                  <td className="py-1 text-right font-medium text-slate-100">
                    {formatValue(item.value, format)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-slate-800/50">
              <span className="w-24 shrink-0 truncate text-[11px] text-slate-300" title={item.label}>
                {item.label}
              </span>
              <div className="h-2.5 min-w-0 flex-1 rounded-sm bg-slate-800">
                <div
                  className="h-full rounded-r-sm transition-[filter] group-hover:brightness-125"
                  style={{ width: `${Math.max((item.value / max) * 100, 2)}%`, backgroundColor: color }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] font-medium text-slate-300">
                {formatValue(item.value, format)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
