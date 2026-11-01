export type Workspace = {
  id: string;
  name: string;
  slug?: string;
  role?: string;
  membership?: { role?: string };
  workspace?: { id: string; name: string; slug?: string };
};

export type Workflow = {
  id: string;
  name: string;
  description?: string | null;
};

export type Step = {
  id: string;
  name: string;
  type: string;
  position: number;
  config?: Record<string, unknown> | null;
};

export type RunStep = {
  id: string;
  stepName: string;
  status: string;
  output?: unknown;
  error?: unknown;
};

export type Run = {
  id: string;
  status: string;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  stepRuns?: RunStep[];
};
