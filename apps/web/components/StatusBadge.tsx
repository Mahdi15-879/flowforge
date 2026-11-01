type StatusBadgeProps = {
  status: string;
};

const statusStyles: Record<string, string> = {
  succeeded: "border-emerald-700/60 bg-emerald-950/70 text-emerald-300",
  failed: "border-rose-700/60 bg-rose-950/70 text-rose-300",
  running: "border-amber-700/60 bg-amber-950/70 text-amber-300",
  pending: "border-slate-600 bg-slate-800 text-slate-300",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-2 rounded-full",
        "border px-3 py-1.5 text-[11px] font-bold",
        "uppercase tracking-wide",
        statusStyles[normalized] ??
          "border-slate-600 bg-slate-800 text-slate-300",
      ].join(" ")}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {status}
    </span>
  );
}
