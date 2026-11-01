"use client";

import { useCallback, useEffect, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  slug?: string;
  role?: string;
  membership?: { role?: string };
  workspace?: { id: string; name: string; slug?: string };
};

type Workflow = {
  id: string;
  name: string;
  description?: string | null;
};

type Step = {
  id: string;
  name: string;
  type: "TRIGGER" | "ACTION";
  position: number;
  config?: Record<string, unknown>;
};

type Run = {
  id: string;
  status: string;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  stepRuns?: Array<{
    id: string;
    stepName: string;
    status: string;
    output?: unknown;
    error?: unknown;
  }>;
};

const BASE = "/backend";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function Home() {
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowId, setWorkflowId] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [stepName, setStepName] = useState("");
  const [stepType, setStepType] = useState<"TRIGGER" | "ACTION">("TRIGGER");
  const [httpUrl, setHttpUrl] = useState(
    "https://jsonplaceholder.typicode.com/todos/1",
  );
  const [httpMethod, setHttpMethod] = useState("GET");
  const [cron, setCron] = useState("0 9 * * *");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const response = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
        cache: "no-store",
      });

      const text = await response.text();
      let data: unknown = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Invalid API response (${response.status})`);
        }
      }

      if (!response.ok) {
        const body = data as { message?: string | string[] } | null;
        const detail = body?.message;
        throw new Error(
          Array.isArray(detail)
            ? detail.join(", ")
            : detail || `Request failed (${response.status})`,
        );
      }

      return data as T;
    },
    [token],
  );

  const loadWorkspaces = useCallback(async () => {
    const data = await request<Workspace[]>("/workspaces");
    const normalized = data.map((item) =>
      item.workspace
        ? { ...item.workspace, role: item.role ?? item.membership?.role }
        : item,
    );
    setWorkspaces(normalized);
    setWorkspaceId((current) =>
      normalized.some((item) => item.id === current)
        ? current
        : (normalized[0]?.id ?? ""),
    );
  }, [request]);

  const loadWorkflows = useCallback(async () => {
    if (!workspaceId) return;
    const data = await request<Workflow[]>(
      `/workspaces/${workspaceId}/workflows`,
    );
    setWorkflows(data);
    setWorkflowId((current) =>
      data.some((item) => item.id === current) ? current : (data[0]?.id ?? ""),
    );
  }, [request, workspaceId]);

  const loadWorkflowDetails = useCallback(async () => {
    if (!workspaceId || !workflowId) return;
    const root = `/workspaces/${workspaceId}/workflows/${workflowId}`;
    const [stepData, runData] = await Promise.all([
      request<Step[]>(`${root}/steps`),
      request<Run[]>(`${root}/runs`),
    ]);
    setSteps(stepData);
    setRuns(runData);
  }, [request, workspaceId, workflowId]);

  useEffect(() => {
    const saved = sessionStorage.getItem("flowforge_token");
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (!token) return;
    loadWorkspaces().catch((err: unknown) => setError(messageOf(err)));
  }, [token, loadWorkspaces]);

  useEffect(() => {
    setWorkflows([]);
    setWorkflowId("");
    setSteps([]);
    setRuns([]);
    setSelectedRun(null);
    if (!workspaceId) return;
    loadWorkflows().catch((err: unknown) => setError(messageOf(err)));
  }, [workspaceId, loadWorkflows]);

  useEffect(() => {
    setSteps([]);
    setRuns([]);
    setSelectedRun(null);
    if (!workflowId) return;
    loadWorkflowDetails().catch((err: unknown) => setError(messageOf(err)));
  }, [workflowId, loadWorkflowDetails]);

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function authenticate() {
    await perform(async () => {
      const payload =
        mode === "register"
          ? { email, password, ...(name.trim() ? { name } : {}) }
          : { email, password };

      const result = await request<{
        accessToken?: string;
        access_token?: string;
        token?: string;
      }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const accessToken =
        result.accessToken ?? result.access_token ?? result.token;

      if (!accessToken) {
        if (mode === "register") {
          setMode("login");
          setNotice("Account created. Please sign in.");
          return;
        }
        throw new Error("Login succeeded but no access token was returned.");
      }

      sessionStorage.setItem("flowforge_token", accessToken);
      setToken(accessToken);
      setNotice("Signed in successfully.");
    });
  }

  function logout() {
    sessionStorage.removeItem("flowforge_token");
    setToken("");
    setWorkspaces([]);
    setWorkspaceId("");
    setWorkflows([]);
    setWorkflowId("");
    setSteps([]);
    setRuns([]);
    setSelectedRun(null);
    setNotice("");
    setError("");
  }

  async function createWorkspace() {
    await perform(async () => {
      const slug =
        workspaceName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `workspace-${Date.now()}`;

      const created = await request<{ id: string }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: workspaceName.trim(), slug }),
      });

      setWorkspaceName("");
      await loadWorkspaces();
      setWorkspaceId(created.id);
      setNotice("Workspace created.");
    });
  }

  async function createWorkflow() {
    if (!workspaceId) return;
    await perform(async () => {
      const created = await request<{ id: string }>(
        `/workspaces/${workspaceId}/workflows`,
        {
          method: "POST",
          body: JSON.stringify({
            name: workflowName.trim(),
            ...(workflowDescription.trim()
              ? { description: workflowDescription.trim() }
              : {}),
          }),
        },
      );
      setWorkflowName("");
      setWorkflowDescription("");
      await loadWorkflows();
      setWorkflowId(created.id);
      setNotice("Workflow created.");
    });
  }

  async function addStep() {
    if (!workspaceId || !workflowId) return;
    await perform(async () => {
      const config =
        stepType === "TRIGGER"
          ? {
              operation: "SCHEDULE",
              cron,
              timezone: "Europe/Berlin",
            }
          : {
              operation: "HTTP_REQUEST",
              url: httpUrl,
              method: httpMethod,
            };

      await request(
        `/workspaces/${workspaceId}/workflows/${workflowId}/steps`,
        {
          method: "POST",
          body: JSON.stringify({
            name: stepName.trim(),
            type: stepType,
            position: steps.length,
            config,
          }),
        },
      );

      setStepName("");
      await loadWorkflowDetails();
      setNotice("Step added.");
    });
  }

  async function executeWorkflow() {
    if (!workspaceId || !workflowId) return;
    await perform(async () => {
      const result = await request<Run>(
        `/workspaces/${workspaceId}/workflows/${workflowId}/runs`,
        { method: "POST" },
      );
      await loadWorkflowDetails();
      setNotice(`Execution finished: ${result.status ?? "submitted"}`);
      if (result.status === "FAILED") {
        setError("Workflow execution failed. Check execution details.");
      }
    });
  }

  async function viewRun(runId: string) {
    if (selectedRun?.id === runId) {
      setSelectedRun(null);
      return;
    }

    if (!workspaceId || !workflowId) return;

    await perform(async () => {
      const data = await request<Run>(
        `/workspaces/${workspaceId}/workflows/${workflowId}/runs/${runId}`,
      );
      setSelectedRun(data);
    });
  }

  const selectedWorkspace = workspaces.find((item) => item.id === workspaceId);
  const selectedWorkflow = workflows.find((item) => item.id === workflowId);

  if (!token) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="brand">◆ FlowForge</div>
          <div className="eyebrow">WORKFLOW AUTOMATION PLATFORM</div>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p>Build, execute, and monitor workflows from one workspace.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void authenticate();
            }}
          >
            {mode === "register" && (
              <label>
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                minLength={mode === "register" ? 12 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
              />
            </label>
            <button disabled={busy} type="submit">
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Need an account? Register"
              : "Already registered? Sign in"}
          </button>
          {error && <p className="alert error">{error}</p>}
          {notice && <p className="alert success">{notice}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">◆ FlowForge</div>
        <div className="sidebar-label">AUTOMATION PLATFORM</div>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#workflows">Workflows</a>
          <a href="#steps">Workflow builder</a>
          <a href="#executions">Executions</a>
        </nav>
        <button className="secondary logout" onClick={logout}>
          Sign out
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">WORKSPACE / OVERVIEW</div>
            <h1>Automation workspace</h1>
            <p>Design, run, and inspect your workflows.</p>
          </div>
          <span className="status-pill">● API connected</span>
        </header>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        <div id="overview" className="cards">
          <article>
            <span>WORKSPACES</span>
            <strong>{workspaces.length}</strong>
            <small>Available to your account</small>
          </article>
          <article>
            <span>WORKFLOWS</span>
            <strong>{workflows.length}</strong>
            <small>In selected workspace</small>
          </article>
          <article>
            <span>RECENT EXECUTIONS</span>
            <strong>{runs.length}</strong>
            <small>Latest 20 for selected workflow</small>
          </article>
        </div>

        <section className="panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">01 / WORKSPACE</div>
              <h2>Choose a workspace</h2>
            </div>
          </div>
          <select
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
          >
            <option value="">Select workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          {selectedWorkspace && (
            <p className="muted">
              {selectedWorkspace.name} · {selectedWorkspace.role ?? "Member"}
            </p>
          )}
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void createWorkspace();
            }}
          >
            <input
              required
              minLength={2}
              placeholder="New workspace name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
            <button disabled={busy}>Create workspace</button>
          </form>
        </section>

        {workspaceId && (
          <section className="panel" id="workflows">
            <div className="eyebrow">02 / WORKFLOWS</div>
            <h2>Your workflows</h2>
            <select
              value={workflowId}
              onChange={(event) => setWorkflowId(event.target.value)}
            >
              <option value="">Select workflow</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
            {selectedWorkflow && (
              <p className="muted">
                {selectedWorkflow.description || "No description"}
              </p>
            )}
            <form
              className="stacked-form"
              onSubmit={(event) => {
                event.preventDefault();
                void createWorkflow();
              }}
            >
              <input
                required
                minLength={2}
                placeholder="Workflow name"
                value={workflowName}
                onChange={(event) => setWorkflowName(event.target.value)}
              />
              <input
                placeholder="Description (optional)"
                value={workflowDescription}
                onChange={(event) => setWorkflowDescription(event.target.value)}
              />
              <button disabled={busy}>Create workflow</button>
            </form>
          </section>
        )}

        {workspaceId && workflowId && (
          <>
            <section className="panel" id="steps">
              <div className="eyebrow">03 / WORKFLOW BUILDER</div>
              <h2>Steps · {selectedWorkflow?.name}</h2>
              {steps.length === 0 ? (
                <p>No steps yet. Add a trigger, then an action.</p>
              ) : (
                <div className="step-list">
                  {steps
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((step, index) => (
                      <div className="step-item" key={step.id}>
                        <span className="step-number">{index + 1}</span>
                        <div>
                          <strong>{step.name}</strong>
                          <small>
                            {step.type} ·{" "}
                            {String(step.config?.operation ?? "Legacy")}
                          </small>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <form
                className="stacked-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addStep();
                }}
              >
                <h3>Add workflow step</h3>
                <input
                  required
                  minLength={2}
                  placeholder="Step name"
                  value={stepName}
                  onChange={(event) => setStepName(event.target.value)}
                />
                <select
                  value={stepType}
                  onChange={(event) =>
                    setStepType(event.target.value as "TRIGGER" | "ACTION")
                  }
                >
                  <option value="TRIGGER">Schedule trigger</option>
                  <option value="ACTION">HTTP request action</option>
                </select>
                {stepType === "TRIGGER" ? (
                  <>
                    <label>
                      Cron expression
                      <input
                        value={cron}
                        onChange={(event) => setCron(event.target.value)}
                        required
                      />
                    </label>
                    <p className="muted">
                      Schedule configuration only. Automatic scheduling is not
                      yet enabled; use Run workflow to execute manually.
                    </p>
                  </>
                ) : (
                  <>
                    <label>
                      HTTPS URL
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
                    <p className="muted">
                      Current backend allowlist: httpbin.org and
                      jsonplaceholder.typicode.com.
                    </p>
                  </>
                )}
                <button disabled={busy}>Add step</button>
              </form>
            </section>

            <section className="panel" id="executions">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">04 / EXECUTIONS</div>
                  <h2>Run history</h2>
                </div>
                <button disabled={busy} onClick={() => void executeWorkflow()}>
                  {busy ? "Working..." : "▶ Run workflow"}
                </button>
              </div>
              {runs.length === 0 ? (
                <p>No executions yet.</p>
              ) : (
                <div className="run-list">
                  {runs.map((run) => (
                    <button
                      key={run.id}
                      className="run-item"
                      disabled={busy}
                      onClick={() => void viewRun(run.id)}
                      aria-expanded={selectedRun?.id === run.id}
                    >
                      <span
                        className={`run-status ${run.status.toLowerCase()}`}
                      >
                        {run.status}
                      </span>
                      <span>{formatDate(run.createdAt)}</span>
                      <span className="run-id">{run.id.slice(0, 8)}</span>
                      <span>
                        {selectedRun?.id === run.id
                          ? "Hide details ↑"
                          : "View details ↓"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedRun && (
                <div className="run-detail">
                  <h3>Execution details</h3>
                  <p>
                    Status: <strong>{selectedRun.status}</strong>
                  </p>
                  <p>Started: {formatDate(selectedRun.startedAt)}</p>
                  <p>Finished: {formatDate(selectedRun.finishedAt)}</p>
                  {selectedRun.stepRuns?.map((step) => (
                    <article key={step.id} className="step-result">
                      <strong>
                        {step.stepName} — {step.status}
                      </strong>
                      {step.output != null && (
                        <pre>{JSON.stringify(step.output, null, 2)}</pre>
                      )}
                      {step.error != null && (
                        <pre>{JSON.stringify(step.error, null, 2)}</pre>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
