import { Activity, Boxes, Layers3, type LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number | string;
  description: string;
  icon: string;
};

const icons: Record<string, LucideIcon> = {
  workspaces: Boxes,
  workflows: Layers3,
  executions: Activity,
};

export function StatCard({ label, value, description, icon }: StatCardProps) {
  const normalized = icon.toLowerCase();

  const Icon =
    icons[normalized] ??
    (normalized.includes("workspace")
      ? Boxes
      : normalized.includes("workflow")
        ? Layers3
        : Activity);

  return (
    <article className="group min-w-0 rounded-2xl border border-slate-700/70 bg-[#172238] p-6 shadow-lg shadow-black/10 transition-colors duration-200 hover:border-indigo-400/40 hover:bg-[#1c2942]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300"
          aria-hidden="true"
        >
          <Icon size={19} strokeWidth={1.8} />
        </span>
      </div>

      <strong className="block text-4xl font-bold tracking-tight text-slate-50">
        {value}
      </strong>

      <p className="mt-3 text-xs leading-5 text-slate-400">{description}</p>
    </article>
  );
}
