"use client";

import { useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Check,
  Play,
  Clock3,
  CalendarClock,
  Terminal,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Run } from "../types/workflow";

type RunHistoryProps = {
  runs: Run[];
  selectedRun: Run | null;
  busy: boolean;
  onRun: () => void | Promise<void>;
  onSelectRun: (id: string) => void | Promise<void>;
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return "—";

  const milliseconds = new Date(end).getTime() - new Date(start).getTime();

  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "—";
  }

  if (milliseconds < 1000) return `${milliseconds} ms`;

  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function JsonOutput({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);

  const formatted = JSON.stringify(value, null, 2) ?? String(value);

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/80 bg-[#0b1324]">
      <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-slate-400">
          <Terminal size={14} />
          JSON OUTPUT
        </div>

        <button
          type="button"
          onClick={() => void copyOutput()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-indigo-400 hover:bg-slate-700 hover:text-white"
        >
          {copied ? <Check size={13} /> : <Clipboard size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="max-h-80 overflow-auto p-4 font-mono text-xs leading-7 whitespace-pre-wrap break-words text-emerald-200">
        {formatted}
      </pre>
    </div>
  );
}

export function RunHistory({
  runs,
  selectedRun,
  busy,
  onRun,
  onSelectRun,
}: RunHistoryProps) {
  return (
    <section
      id="executions"
      className="rounded-2xl border border-slate-700/70 bg-[#172238] p-7 shadow-xl shadow-black/10"
    >
      <div className="mb-7 flex flex-wrap items-center justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-indigo-400">
            <Activity size={15} />
            04 / EXECUTIONS
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-50">
            Run history
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Monitor execution status and inspect step outputs.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onRun()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/30 transition-colors hover:bg-indigo-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={16} fill="currentColor" />
          {busy ? "Running..." : "Run workflow"}
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 p-8 text-center">
          <Clock3 className="mb-3 text-slate-400" size={28} />
          <strong className="text-slate-100">No executions yet</strong>
          <p className="mt-2 text-sm text-slate-400">
            Run your workflow to see execution results here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const expanded = selectedRun?.id === run.id;

            return (
              <article
                key={run.id}
                className={`overflow-hidden rounded-xl border bg-[#1c2942] transition-colors ${
                  expanded ? "border-indigo-400/60" : "border-slate-700"
                }`}
              >
                <button
                  type="button"
                  disabled={busy}
                  aria-expanded={expanded}
                  onClick={() => void onSelectRun(run.id)}
                  className="grid w-full cursor-pointer grid-cols-2 items-center gap-4 p-5 text-left text-slate-100 transition-colors hover:bg-[#2a3957] hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 md:grid-cols-[1fr_1.5fr_0.7fr_auto]"
                >
                  <StatusBadge status={run.status} />

                  <span className="flex items-center gap-2 text-xs text-slate-300">
                    <CalendarClock
                      size={14}
                      className="shrink-0 text-slate-400"
                    />
                    {formatDate(run.createdAt)}
                  </span>

                  <code className="text-xs text-indigo-200">
                    {run.id.slice(0, 8)}
                  </code>

                  <span className="inline-flex items-center justify-end gap-2 text-xs font-semibold text-indigo-300">
                    {expanded ? (
                      <>
                        Hide details <ChevronUp size={16} />
                      </>
                    ) : (
                      <>
                        View details <ChevronDown size={16} />
                      </>
                    )}
                  </span>
                </button>

                {expanded && selectedRun && (
                  <div className="border-t border-slate-700 bg-[#121c30] p-5 md:p-7">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-100">
                        Execution details
                      </h3>
                      <StatusBadge status={selectedRun.status} />
                    </div>

                    <div className="mb-5 grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          label: "Started",
                          value: formatDate(selectedRun.startedAt),
                        },
                        {
                          label: "Finished",
                          value: formatDate(selectedRun.finishedAt),
                        },
                        {
                          label: "Duration",
                          value: formatDuration(
                            selectedRun.startedAt,
                            selectedRun.finishedAt,
                          ),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-slate-700 bg-slate-800/70 p-4"
                        >
                          <div className="mb-2 text-xs text-slate-400">
                            {item.label}
                          </div>
                          <div className="break-words text-sm font-semibold text-slate-100">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {selectedRun.stepRuns?.map((step, index) => (
                        <div
                          key={step.id}
                          className="rounded-xl border border-slate-700 bg-[#1d2a43] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-slate-200">
                              {index + 1}
                            </span>

                            <strong className="min-w-0 flex-1 text-sm text-slate-100">
                              {step.stepName}
                            </strong>

                            <StatusBadge status={step.status} />
                          </div>

                          {step.output != null && (
                            <JsonOutput value={step.output} />
                          )}

                          {step.error != null && (
                            <div className="mt-4">
                              <div className="text-xs font-bold text-rose-300">
                                EXECUTION ERROR
                              </div>
                              <JsonOutput value={step.error} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
