// Ported from src/lib/shiftReportFormatting.ts (mobile) so the two
// renderings can't silently drift.

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDuration(startAt: string, endAt: string | null): string {
  if (!endAt) return "en cours";
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return `${hours}h${minutes.toString().padStart(2, "0")}`;
}
