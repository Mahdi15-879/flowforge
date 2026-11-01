"use client";

import type { FormEvent } from "react";

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
    <section className="panel workflow-builder-panel" id="steps">
      <div className="eyebrow">03 / WORKFLOW BUILDER</div>

      <div className="builder-heading">
        <div>
          <h2>{workflowName ?? "Workflow builder"}</h2>
          <p className="muted">
            Configure the steps in your automation pipeline.
          </p>
        </div>
        <span className="builder-count">{orderedSteps.length} steps</span>
      </div>

      <div className="builder-layout">
        <div className="builder-canvas">
          <div className="builder-canvas-title">
            <span>Execution flow</span>
            <span className="builder-canvas-subtitle">Ordered pipeline</span>
          </div>

          {orderedSteps.length === 0 ? (
            <div className="builder-empty">
              <div className="builder-empty-icon">+</div>
              <strong>Your workflow starts here</strong>
              <p>Add a trigger followed by an action.</p>
            </div>
          ) : (
            <div className="workflow-nodes">
              {orderedSteps.map((step, index) => (
                <div className="workflow-node-wrap" key={step.id}>
                  <article className="workflow-node">
                    <div
                      className={
                        step.type === "TRIGGER"
                          ? "workflow-node-icon trigger"
                          : "workflow-node-icon action"
                      }
                      aria-hidden="true"
                    >
                      {step.type === "TRIGGER" ? "◷" : "↗"}
                    </div>

                    <div className="workflow-node-content">
                      <span className="workflow-node-type">{step.type}</span>
                      <strong>{step.name}</strong>
                      <small>
                        {String(step.config?.operation ?? "Legacy")}
                      </small>
                    </div>

                    <span className="workflow-node-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </article>

                  {index < orderedSteps.length - 1 && (
                    <div className="workflow-connector" aria-hidden="true">
                      <span />↓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <form className="builder-form" onSubmit={handleSubmit}>
          <div className="builder-form-header">
            <h3>Add a step</h3>
            <p>Extend your workflow pipeline.</p>
          </div>

          <label>
            Step name
            <input
              required
              minLength={2}
              placeholder="e.g. Fetch customer data"
              value={stepName}
              onChange={(event) => setStepName(event.target.value)}
            />
          </label>

          <label>
            Step type
            <select
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
              <label>
                Cron expression
                <input
                  required
                  value={cron}
                  onChange={(event) => setCron(event.target.value)}
                />
              </label>
              <p className="builder-help">
                Scheduling is configuration-only for now. Run the workflow
                manually to execute it.
              </p>
            </>
          ) : (
            <>
              <label>
                HTTPS endpoint
                <input
                  required
                  type="url"
                  value={httpUrl}
                  onChange={(event) => setHttpUrl(event.target.value)}
                />
              </label>

              <label>
                HTTP method
                <select
                  value={httpMethod}
                  onChange={(event) => setHttpMethod(event.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </label>

              <p className="builder-help">
                Supported hosts: httpbin.org and jsonplaceholder.typicode.com.
              </p>
            </>
          )}

          <button type="submit" disabled={busy}>
            {busy ? "Adding step..." : "+ Add step"}
          </button>
        </form>
      </div>
    </section>
  );
}
