"use client";

import type { FormEvent } from "react";
import { ArrowDown, Clock3, Globe2, Plus, Workflow } from "lucide-react";

export type WorkflowStep = {
  id: string;
  name: string;
  type: string;
  position: number;
  config?: Record<string, unknown> | null;
};

type WorkflowBuilderProps = {
  workflowName?: string;
  steps: WorkflowStep[];
  busy: boolean;
  stepName: string;
  setStepName: (value: string) => void;
  stepType: "TRIGGER" | "ACTION";
  setStepType: (value: "TRIGGER" | "ACTION") => void;
  cron: string;
  setCron: (value: string) => void;
  httpUrl: string;
  setHttpUrl: (value: string) => void;
  httpMethod: string;
  setHttpMethod: (value: string) => void;
  onAddStep: () => void | Promise<void>;
};

const inputClass =
  "w-full min-h-11 rounded-xl border border-slate-600/70 bg-[#0e172a] px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

const labelClass = "flex flex-col gap-2 text-xs font-semibold text-slate-200";

export function WorkflowBuilder({
  workflowName,
  steps,
  busy,
  stepName,
  setStepName,
  stepType,
  setStepType,
  cron,
  setCron,
  httpUrl,
  setHttpUrl,
  httpMethod,
  setHttpMethod,
  onAddStep,
}: WorkflowBuilderProps) {
  const orderedSteps = [...steps].sort((a, b) => a.position - b.position);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onAddStep();
  }

  return (
    <section
      id="steps"
      className="mb-6 rounded-2xl border border-slate-700/70 bg-[#172238] p-5 shadow-xl shadow-black/10 md:p-7"
    >
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-indigo-400">
        <Workflow size={16} />
        03 / WORKFLOW BUILDER
      </div>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-50">
            {workflowName ?? "Workflow builder"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Configure the steps in your automation pipeline.
          </p>
        </div>

        <span className="rounded-full border border-slate-600/50 bg-slate-800 px-3 py-2 text-xs font-semibold text-indigo-200">
          {orderedSteps.length} steps
        </span>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="min-h-[390px] min-w-0 rounded-2xl border border-slate-700/80 bg-[#11192b] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-100">Execution flow</h3>
            <span className="text-xs text-slate-400">Ordered pipeline</span>
          </div>

          {orderedSteps.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-indigo-400/60 bg-indigo-500/10 text-indigo-300">
                <Plus size={25} />
              </div>
              <strong className="text-sm text-slate-100">
                Your workflow starts here
              </strong>
              <p className="text-xs text-slate-400">
                Add a trigger followed by an action.
              </p>
            </div>
          ) : (
            <div className="mx-auto mt-8 max-w-[460px]">
              {orderedSteps.map((step, index) => {
                const isTrigger = step.type === "TRIGGER";

                return (
                  <div key={step.id}>
                    <article className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-600/70 bg-[#1d2a43] p-5 shadow-lg shadow-black/10">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          isTrigger
                            ? "bg-violet-500/20 text-violet-300"
                            : "bg-teal-500/20 text-teal-300"
                        }`}
                        aria-hidden="true"
                      >
                        {isTrigger ? (
                          <Clock3 size={22} strokeWidth={1.8} />
                        ) : (
                          <Globe2 size={22} strokeWidth={1.8} />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-[0.16em] text-indigo-300">
                          {step.type}
                        </span>
                        <strong className="break-words text-sm text-slate-50">
                          {step.name}
                        </strong>
                        <span className="text-xs text-slate-400">
                          {String(step.config?.operation ?? "Legacy")}
                        </span>
                      </div>

                      <span className="self-start font-mono text-xs text-slate-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </article>

                    {index < orderedSteps.length - 1 && (
                      <div
                        className="flex h-14 flex-col items-center justify-center text-indigo-400"
                        aria-hidden="true"
                      >
                        <div className="h-7 w-px bg-indigo-400/80" />
                        <ArrowDown size={17} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-col gap-5 rounded-2xl border border-slate-700/80 bg-[#1a243b] p-5 md:p-6"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-50">Add a step</h3>
            <p className="mt-2 text-xs text-slate-400">
              Extend your workflow pipeline.
            </p>
          </div>

          <label className={labelClass}>
            Step name
            <input
              required
              minLength={2}
              className={inputClass}
              placeholder="e.g. Fetch customer data"
              value={stepName}
              onChange={(event) => setStepName(event.target.value)}
            />
          </label>

          <label className={labelClass}>
            Step type
            <select
              className={inputClass}
              value={stepType}
              onChange={(event) =>
                setStepType(event.target.value as "TRIGGER" | "ACTION")
              }
            >
              <option value="TRIGGER">Schedule trigger</option>
              <option value="ACTION">HTTP request action</option>
            </select>
          </label>

          {stepType === "TRIGGER" ? (
            <>
              <label className={labelClass}>
                Cron expression
                <input
                  required
                  className={inputClass}
                  value={cron}
                  onChange={(event) => setCron(event.target.value)}
                />
              </label>

              <p className="text-xs leading-6 text-slate-400">
                Scheduling is configuration-only for now. Run the workflow
                manually to execute it.
              </p>
            </>
          ) : (
            <>
              <label className={labelClass}>
                HTTPS endpoint
                <input
                  required
                  type="url"
                  className={inputClass}
                  value={httpUrl}
                  onChange={(event) => setHttpUrl(event.target.value)}
                />
              </label>

              <label className={labelClass}>
                HTTP method
                <select
                  className={inputClass}
                  value={httpMethod}
                  onChange={(event) => setHttpMethod(event.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </label>

              <p className="text-xs leading-6 text-slate-400">
                Supported hosts: httpbin.org and jsonplaceholder.typicode.com.
              </p>
            </>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            {busy ? "Adding step..." : "Add step"}
          </button>
        </form>
      </div>
    </section>
  );
}
