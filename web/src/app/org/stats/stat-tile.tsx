import type { ReactNode } from "react";

export function StatTile({
  icon,
  label,
  value,
  sub,
  iconClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: ReactNode;
  iconClassName: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconClassName}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] leading-tight text-slate-400">{label}</p>
        <p className="text-base font-semibold leading-tight text-white">{value}</p>
        {sub}
      </div>
    </div>
  );
}
