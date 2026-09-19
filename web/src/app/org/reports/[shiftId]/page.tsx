import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REFERENCE_LIST, type CategoryCode } from "../reference-list";
import { formatDateTime, formatDuration } from "../formatting";
import { PrintButton } from "../print-button";
import {
  ArrowLeft,
  User,
  Building2,
  LogIn,
  LogOut,
  Timer,
  ClipboardList,
  ShieldAlert,
  BellRing,
  Flame,
  Users,
  Car,
  ClipboardCheck,
  AlertTriangle,
  PhoneCall,
  type LucideIcon,
} from "lucide-react";

interface ShiftReportRow {
  agent_name: string;
  site_name: string;
  status: "open" | "closed";
  start_at: string;
  end_at: string | null;
}

interface EventRow {
  id: string;
  category_code: string;
  item_codes: string[];
  comment: string | null;
  occurred_at: string;
}

interface PhotoRow {
  id: string;
  event_id: string;
  storage_path: string;
}

interface EventVM {
  id: string;
  categoryCode: CategoryCode;
  itemCodes: string[];
  comment: string | null;
  occurredAt: string;
  photoUrls: string[];
}

// Distinct hue per category so the timeline is scannable at a glance -- this
// is an internal detail view (not a shared cross-filter chart), so it isn't
// run through the CVD validator the way the stats dashboard's palettes are;
// every category also always renders with its icon + text label, never color
// alone.
const CATEGORY_META: Record<CategoryCode, { icon: LucideIcon; tint: string; bar: string }> = {
  intrusion: { icon: ShieldAlert, tint: "bg-red-500/15 text-red-400", bar: "bg-red-500" },
  alarmes: { icon: BellRing, tint: "bg-amber-500/15 text-amber-400", bar: "bg-amber-500" },
  incendie: { icon: Flame, tint: "bg-orange-500/15 text-orange-400", bar: "bg-orange-500" },
  personnes: { icon: Users, tint: "bg-blue-500/15 text-blue-400", bar: "bg-blue-500" },
  vehicules: { icon: Car, tint: "bg-cyan-500/15 text-cyan-400", bar: "bg-cyan-500" },
  controle_site: { icon: ClipboardCheck, tint: "bg-emerald-500/15 text-emerald-400", bar: "bg-emerald-500" },
  degradations_vols: { icon: AlertTriangle, tint: "bg-pink-500/15 text-pink-400", bar: "bg-pink-500" },
  interventions_exterieures: { icon: PhoneCall, tint: "bg-purple-500/15 text-purple-400", bar: "bg-purple-500" },
};

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-400">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] leading-tight text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold leading-tight text-white">{value}</p>
      </div>
    </div>
  );
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const supabase = await createClient();

  const { data: shift } = await supabase
    .from("shift_reports")
    .select("*")
    .eq("shift_id", shiftId)
    .maybeSingle<ShiftReportRow>();

  if (!shift) notFound();

  const { data: eventRows } = await supabase
    .from("events")
    .select("*")
    .eq("shift_id", shiftId)
    .order("occurred_at", { ascending: true })
    .returns<EventRow[]>();

  const events = eventRows ?? [];
  const eventIds = events.map((e) => e.id);

  const photosByEvent: Record<string, string[]> = {};
  if (eventIds.length > 0) {
    const { data: photoRows } = await supabase
      .from("photos")
      .select("*")
      .in("event_id", eventIds)
      .returns<PhotoRow[]>();

    for (const photo of photoRows ?? []) {
      const { data: signed } = await supabase.storage
        .from("shift-photos")
        .createSignedUrl(photo.storage_path, 3600);
      if (signed?.signedUrl) {
        photosByEvent[photo.event_id] = [...(photosByEvent[photo.event_id] ?? []), signed.signedUrl];
      }
    }
  }

  const eventVMs: EventVM[] = events.map((e) => ({
    id: e.id,
    categoryCode: e.category_code as CategoryCode,
    itemCodes: e.item_codes,
    comment: e.comment,
    occurredAt: e.occurred_at,
    photoUrls: photosByEvent[e.id] ?? [],
  }));

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/org/reports"
            className="no-print flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft size={15} />
            Retour
          </Link>
          <h1 className="text-lg font-semibold text-white">Compte rendu de service</h1>
        </div>
        <PrintButton />
      </div>

      {/* Screen view -- a dark, icon-led timeline matching the rest of the
          console. Hidden at print time in favor of the plain paper render
          below: window.print() output is a legally-relevant document (see
          the shifts table's client_created_at comment), so it stays exactly
          as before rather than risking a "cool" dark redesign clipping or
          misprinting. */}
      <div className="min-h-0 flex-1 overflow-y-auto print:hidden">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <InfoTile icon={User} label="Agent" value={shift.agent_name} />
            <InfoTile icon={Building2} label="Site" value={shift.site_name} />
            <InfoTile icon={LogIn} label="Début" value={formatDateTime(shift.start_at)} />
            <InfoTile
              icon={LogOut}
              label="Fin"
              value={shift.end_at ? formatDateTime(shift.end_at) : "En cours"}
            />
            <InfoTile icon={Timer} label="Durée" value={formatDuration(shift.start_at, shift.end_at)} />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <ClipboardList size={15} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Événements ({eventVMs.length})</h2>
            </div>

            {eventVMs.length === 0 && (
              <p className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-6 text-center italic text-slate-500">
                Aucun événement enregistré.
              </p>
            )}

            <div className="space-y-2.5">
              {eventVMs.map((event) => {
                const category = REFERENCE_LIST.find((c) => c.code === event.categoryCode);
                const meta = CATEGORY_META[event.categoryCode];
                const Icon = meta?.icon ?? ClipboardList;
                return (
                  <div key={event.id} className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900 py-3 pl-4 pr-3">
                    <div className={`absolute left-0 top-0 h-full w-1 ${meta?.bar ?? "bg-slate-600"}`} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${meta?.tint ?? "bg-slate-800 text-slate-400"}`}>
                          <Icon size={14} />
                        </div>
                        <p className="text-sm font-semibold text-white">{category?.label ?? event.categoryCode}</p>
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}</p>
                    </div>

                    {event.itemCodes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {event.itemCodes.map((code) => (
                          <span key={code} className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                            {category?.items.find((i) => i.code === code)?.label ?? code}
                          </span>
                        ))}
                      </div>
                    )}

                    {event.comment && <p className="mt-2 text-sm italic text-slate-400">{event.comment}</p>}

                    {event.photoUrls.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {event.photoUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="h-20 w-20 rounded-md object-cover ring-1 ring-slate-700 transition-all group-hover:ring-2 group-hover:ring-blue-500"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Print-only paper: unchanged plain light layout, exactly what gets
          exported via window.print(). A dark PDF export would be both hard
          to read and wasteful to print. */}
      <div className="hidden print:block">
        <div className="space-y-6 rounded-xl bg-white p-6 text-gray-900">
          <div className="space-y-1 rounded-lg bg-gray-100 p-4 text-sm">
            <p>Agent : {shift.agent_name}</p>
            <p>Site : {shift.site_name}</p>
            <p>Début : {formatDateTime(shift.start_at)}</p>
            <p>Fin : {shift.end_at ? formatDateTime(shift.end_at) : "en cours"}</p>
            <p>Durée : {formatDuration(shift.start_at, shift.end_at)}</p>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Événements ({eventVMs.length})</h2>
            {eventVMs.length === 0 && (
              <p className="italic text-gray-500">Aucun événement enregistré.</p>
            )}
            <div className="space-y-4">
              {eventVMs.map((event) => {
                const category = REFERENCE_LIST.find((c) => c.code === event.categoryCode);
                const itemLabels = event.itemCodes
                  .map((code) => category?.items.find((i) => i.code === code)?.label ?? code)
                  .join(", ");
                return (
                  <div key={event.id} className="border-l-2 border-blue-700 pl-3">
                    <p className="text-xs text-gray-500">{formatDateTime(event.occurredAt)}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {category?.label ?? event.categoryCode}
                    </p>
                    <p className="text-sm text-gray-700">{itemLabels}</p>
                    {event.comment && <p className="text-sm italic text-gray-600">{event.comment}</p>}
                    {event.photoUrls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {event.photoUrls.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <a key={url} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" className="h-24 w-24 rounded object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
