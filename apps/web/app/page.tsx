"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { WorkflowBuilder } from "../components/WorkflowBuilder";
import { RunHistory } from "../components/RunHistory";
import { StatCard } from "../components/StatCard";
import { ApiHealthIndicator } from "../components/ApiHealthIndicator";
import { apiRequest, SESSION_EXPIRED } from "../lib/api-client";
import { useAuth } from "../hooks/useAuth";
import type { Workspace, Workflow, Step, Run } from "../types/workflow";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Home() {
  const {
    token,
    activeTokenRef,
    authenticate: authenticateUser,
    clearAuth,
  } = useAuth();
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

  const clearSession = useCallback(
    (expired = false) => {
      clearAuth();
      setMode("login");
      setWorkspaces([]);
      setWorkspaceId("");
      setWorkflows([]);
      setWorkflowId("");
      setSteps([]);
      setRuns([]);
      setSelectedRun(null);
      setNotice("");
      setError(
        expired ? "Your session has expired. Please sign in again." : "",
      );
    },
    [clearAuth],
  );

  const request = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const requestToken = token;

      return apiRequest<T>(path, options, {
        token: requestToken,
        onUnauthorized: () => clearSession(true),
        isSessionCurrent: () => activeTokenRef.current === requestToken,
      });
    },
    [token, clearSession],
  );

  function handleLoadError(err: unknown) {
    if (err instanceof Error && err.message === SESSION_EXPIRED) return;
    if (!activeTokenRef.current) return;
    setError(messageOf(err));
  }

  const loadWorkspaces = useCallback(async () => {
    const sessionToken = activeTokenRef.current;
    const data = await request<Workspace[]>("/workspaces");
    if (activeTokenRef.current !== sessionToken) return;
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
    const sessionToken = activeTokenRef.current;
    const data = await request<Workflow[]>(
      `/workspaces/${workspaceId}/workflows`,
    );
    if (activeTokenRef.current !== sessionToken) return;
    setWorkflows(data);
    setWorkflowId((current) =>
      data.some((item) => item.id === current) ? current : (data[0]?.id ?? ""),
    );
  }, [request, workspaceId]);

  const loadWorkflowDetails = useCallback(async () => {
    if (!workspaceId || !workflowId) return;
    const sessionToken = activeTokenRef.current;
    const root = `/workspaces/${workspaceId}/workflows/${workflowId}`;
    const [stepData, runData] = await Promise.all([
      request<Step[]>(`${root}/steps`),
      request<Run[]>(`${root}/runs`),
    ]);
    if (activeTokenRef.current !== sessionToken) return;
    setSteps(stepData);
    setRuns(runData);
  }, [request, workspaceId, workflowId]);

  useEffect(() => {
    if (!token) return;
    loadWorkspaces().catch(handleLoadError);
  }, [token, loadWorkspaces]);

  useEffect(() => {
    setWorkflows([]);
    setWorkflowId("");
    setSteps([]);
    setRuns([]);
    setSelectedRun(null);
    if (!workspaceId) return;
    loadWorkflows().catch(handleLoadError);
  }, [workspaceId, loadWorkflows]);

  useEffect(() => {
    setSteps([]);
    setRuns([]);
    setSelectedRun(null);
    if (!workflowId) return;
    loadWorkflowDetails().catch(handleLoadError);
  }, [workflowId, loadWorkflowDetails]);

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      if (!(err instanceof Error && err.message === SESSION_EXPIRED)) {
        setError(messageOf(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function authenticate() {
    await perform(async () => {
      const accessToken = await authenticateUser(mode, {
        email,
        password,
        name,
      });

      if (!accessToken) {
        if (mode === "register") {
          setMode("login");
          setNotice("Account created. Please sign in.");
          return;
        }

        throw new Error("Login succeeded but no access token was returned.");
      }

      setNotice("Signed in successfully.");
    });
  }

  function logout() {
    clearSession();
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
      <main className="flex min-h-dvh items-center justify-center bg-[#0b1020] px-4 py-10 text-slate-100">
        <section className="w-full max-w-md rounded-3xl border border-slate-700/70 bg-[#172238] p-7 shadow-2xl shadow-black/30 sm:p-9">
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-xl font-bold text-white">
                ◆
              </span>
              <span className="text-xl font-extrabold tracking-tight text-white">
                FlowForge
              </span>
            </div>

            <p className="mb-3 text-[11px] font-bold tracking-[0.18em] text-indigo-400">
              WORKFLOW AUTOMATION PLATFORM
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Build, execute, and monitor workflows from one workspace.
            </p>
          </div>

          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void authenticate();
            }}
          >
            {mode === "register" && (
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                Name
                <input
                  className="min-h-12 w-full rounded-xl border border-slate-600/70 bg-[#0e172a] px-4 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              Email
              <input
                className="min-h-12 w-full rounded-xl border border-slate-600/70 bg-[#0e172a] px-4 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              Password
              <input
                className="min-h-12 w-full rounded-xl border border-slate-600/70 bg-[#0e172a] px-4 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                type="password"
                required
                minLength={mode === "register" ? 12 : undefined}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
              />
            </label>

            <button
              disabled={busy}
              type="submit"
              className="mt-2 min-h-12 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <button
            type="button"
            className="mt-6 w-full rounded-lg py-2 text-center text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-2 focus-visible:outline-indigo-300"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Need an account? Register"
              : "Already registered? Sign in"}
          </button>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
            >
              {error}
            </p>
          )}

          {notice && (
            <p
              role="status"
              className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
            >
              {notice}
            </p>
          )}
        </section>
      </main>
    );
  }

  const panelClass =
    "rounded-2xl border border-slate-700/70 bg-[#172238] p-5 shadow-lg shadow-black/10 md:p-7";

  const inputClass =
    "min-h-12 w-full min-w-0 rounded-xl border border-slate-600/70 bg-[#0e172a] px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

  const buttonClass =
    "inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="min-h-dvh bg-[#0b1020] text-slate-100 lg:flex">
      <Sidebar onLogout={logout} />

      <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="mb-4 text-[11px] font-bold tracking-[0.18em] text-indigo-400">
                WORKSPACE / OVERVIEW
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                Automation workspace
              </h1>
              <p className="mt-4 text-sm text-slate-400 sm:text-base">
                Design, run, and inspect your workflows.
              </p>
            </div>

            <ApiHealthIndicator />
          </header>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
            >
              {notice}
            </div>
          )}

          <div id="overview" className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Workspaces"
              value={workspaces.length}
              description="Available to your account"
              icon="workspaces"
            />
            <StatCard
              label="Workflows"
              value={workflows.length}
              description="In selected workspace"
              icon="workflows"
            />
            <StatCard
              label="Recent executions"
              value={runs.length}
              description="Latest 20 for selected workflow"
              icon="executions"
            />
          </div>

          <section className={panelClass}>
            <div className="mb-6">
              <div className="mb-3 text-[11px] font-bold tracking-[0.18em] text-indigo-400">
                01 / WORKSPACE
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-50">
                Choose a workspace
              </h2>
            </div>

            <select
              className={inputClass}
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              aria-label="Choose workspace"
            >
              <option value="">Select workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>

            {selectedWorkspace && (
              <p className="mt-3 text-xs text-slate-400">
                {selectedWorkspace.name} · {selectedWorkspace.role ?? "Member"}
              </p>
            )}

            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void createWorkspace();
              }}
            >
              <input
                required
                minLength={2}
                className={`${inputClass} flex-1`}
                placeholder="New workspace name"
                aria-label="New workspace name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
              />
              <button disabled={busy} type="submit" className={buttonClass}>
                Create workspace
              </button>
            </form>
          </section>

          {workspaceId && (
            <section id="workflows" className={panelClass}>
              <div className="mb-6">
                <div className="mb-3 text-[11px] font-bold tracking-[0.18em] text-indigo-400">
                  02 / WORKFLOWS
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-50">
                  Your workflows
                </h2>
              </div>

              <select
                className={inputClass}
                value={workflowId}
                onChange={(event) => setWorkflowId(event.target.value)}
                aria-label="Choose workflow"
              >
                <option value="">Select workflow</option>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>

              {selectedWorkflow && (
                <p className="mt-3 text-xs text-slate-400">
                  {selectedWorkflow.description || "No description"}
                </p>
              )}

              <form
                className="mt-6 flex flex-col gap-3 border-t border-slate-700/70 pt-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createWorkflow();
                }}
              >
                <input
                  required
                  minLength={2}
                  className={inputClass}
                  placeholder="Workflow name"
                  aria-label="Workflow name"
                  value={workflowName}
                  onChange={(event) => setWorkflowName(event.target.value)}
                />

                <input
                  className={inputClass}
                  placeholder="Description (optional)"
                  aria-label="Workflow description"
                  value={workflowDescription}
                  onChange={(event) =>
                    setWorkflowDescription(event.target.value)
                  }
                />

                <div>
                  <button disabled={busy} type="submit" className={buttonClass}>
                    Create workflow
                  </button>
                </div>
              </form>
            </section>
          )}

          {workspaceId && workflowId && (
            <>
              <WorkflowBuilder
                workflowName={selectedWorkflow?.name}
                steps={steps}
                busy={busy}
                stepName={stepName}
                setStepName={setStepName}
                stepType={stepType}
                setStepType={setStepType}
                cron={cron}
                setCron={setCron}
                httpUrl={httpUrl}
                setHttpUrl={setHttpUrl}
                httpMethod={httpMethod}
                setHttpMethod={setHttpMethod}
                onAddStep={addStep}
              />

              <RunHistory
                runs={runs}
                selectedRun={selectedRun}
                busy={busy}
                onRun={executeWorkflow}
                onSelectRun={viewRun}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
