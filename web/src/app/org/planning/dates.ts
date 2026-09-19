// Monday-based week, matching the fr-FR locale convention used throughout
// this console (formatDateTime etc. already use "fr-FR").

export function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + n);
  return next;
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(d, diff));
}

export function weekRange(anchor: Date): { start: Date; end: Date } {
  const start = startOfWeek(anchor);
  return { start, end: addDays(start, 7) };
}

/** Padded to full weeks (6 rows x 7 cols) so every visible cell has data. */
export function monthGridRange(anchor: Date): { start: Date; end: Date } {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(firstOfMonth);
  return { start, end: addDays(start, 42) };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** "YYYY-MM-DDTHH:mm" for a datetime-local input default value. */
export function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
