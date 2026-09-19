"use client";

import { Download } from "lucide-react";

// Client-side CSV generation from data the server component already fetched
// -- no extra round trip needed, the page already has the exact filtered
// rows on screen.
function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export function DownloadCsvButton({
  rows,
  filename,
  label = "Exporter CSV",
}: {
  rows: Record<string, string | number>[];
  filename: string;
  label?: string;
}) {
  function handleClick() {
    const csv = toCsv(rows);
    // Leading BOM so Excel correctly detects UTF-8 (otherwise accented
    // French characters render as mojibake when opened there).
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleClick}
      disabled={rows.length === 0}
      className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
    >
      <Download size={13} />
      {label}
    </button>
  );
}
