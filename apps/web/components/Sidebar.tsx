"use client";

import { useState } from "react";
import {
  Activity,
  Boxes,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Workflow,
  Zap,
} from "lucide-react";

type SidebarProps = {
  onLogout: () => void;
};

const navigation = [
  {
    href: "#overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "#workflows",
    label: "Workflows",
    icon: Boxes,
  },
  {
    href: "#steps",
    label: "Workflow Builder",
    icon: Workflow,
  },
  {
    href: "#executions",
    label: "Executions",
    icon: Activity,
  },
];

export function Sidebar({ onLogout }: SidebarProps) {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-[#0c1020] px-4 py-6 lg:sticky lg:top-0 lg:h-dvh lg:w-[252px] lg:overflow-y-auto lg:self-start lg:border-r lg:border-b-0">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-indigo-950/40">
          <Zap size={23} fill="currentColor" />
        </div>

        <div>
          <div className="text-lg font-extrabold tracking-tight text-slate-50">
            FlowForge
          </div>
          <div className="mt-1 text-[9px] font-bold tracking-[0.16em] text-slate-400">
            AUTOMATION PLATFORM
          </div>
        </div>
      </div>

      <div className="mb-4 px-3 text-[10px] font-bold tracking-[0.2em] text-slate-500">
        WORKSPACE
      </div>

      <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.href.slice(1);

          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setActiveSection(item.href.slice(1))}
              aria-current={active ? "location" : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-200"
                  : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={1.9}
                className={
                  active
                    ? "text-indigo-300"
                    : "text-slate-500 group-hover:text-indigo-300"
                }
              />

              <span className="flex-1">{item.label}</span>

              {active && <ChevronRight size={15} className="text-indigo-300" />}
            </a>
          );
        })}
      </nav>

      <div className="mt-auto pt-10">
        <div className="border-t border-slate-800 px-2 pt-5">
          <div className="mb-5 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            FlowForge MVP · v0.1
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
