"use client";

import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Workflow } from "../types/workflow";

type ApiRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

type UseWorkflowsOptions = {
  request: ApiRequest;
  activeTokenRef: MutableRefObject<string>;
  workspaceId: string;
};

export function useWorkflows({
  request,
  activeTokenRef,
  workspaceId,
}: UseWorkflowsOptions) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowId, setWorkflowId] = useState("");

  const requestVersionRef = useRef(0);
  const currentWorkspaceIdRef = useRef(workspaceId);
  currentWorkspaceIdRef.current = workspaceId;

  const loadWorkflows = useCallback(async () => {
    if (!workspaceId) return;

    const sessionToken = activeTokenRef.current;
    const requestVersion = requestVersionRef.current;
    const requestedWorkspaceId = workspaceId;

    const data = await request<Workflow[]>(
      `/workspaces/${requestedWorkspaceId}/workflows`,
    );

    if (
      activeTokenRef.current !== sessionToken ||
      requestVersionRef.current !== requestVersion ||
      currentWorkspaceIdRef.current !== requestedWorkspaceId
    ) {
      return;
    }

    setWorkflows(data);

    setWorkflowId((current) =>
      data.some((item) => item.id === current) ? current : (data[0]?.id ?? ""),
    );
  }, [request, activeTokenRef, workspaceId]);

  const resetWorkflows = useCallback(() => {
    requestVersionRef.current += 1;
    setWorkflows([]);
    setWorkflowId("");
  }, []);

  return {
    workflows,
    setWorkflows,
    workflowId,
    setWorkflowId,
    loadWorkflows,
    resetWorkflows,
  };
}
