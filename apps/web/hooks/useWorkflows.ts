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
  const [workflowId, setWorkflowIdState] = useState("");
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState("");

  const requestVersionRef = useRef(0);
  const currentWorkspaceIdRef = useRef(workspaceId);

  currentWorkspaceIdRef.current = workspaceId;

  const setWorkflowId = useCallback(
    (id: string) => {
      setWorkflowIdState(id);

      if (workspaceId && id) {
        localStorage.setItem(`flowforge:selectedWorkflow:${workspaceId}`, id);
      }
    },
    [workspaceId],
  );

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

    setLoadedWorkspaceId(requestedWorkspaceId);
    setWorkflows(data);

    const storageKey = `flowforge:selectedWorkflow:${requestedWorkspaceId}`;

    const savedId = localStorage.getItem(storageKey);

    setWorkflowIdState((current) => {
      const preferredId = savedId || current;

      return data.some((item) => item.id === preferredId)
        ? preferredId
        : (data[0]?.id ?? "");
    });
  }, [request, activeTokenRef, workspaceId]);

  const resetWorkflows = useCallback(() => {
    requestVersionRef.current += 1;

    setLoadedWorkspaceId("");
    setWorkflows([]);
    setWorkflowIdState("");
  }, []);

  return {
    workflows,
    setWorkflows,
    workflowId,
    setWorkflowId,
    loadedWorkspaceId,
    loadWorkflows,
    resetWorkflows,
  };
}
