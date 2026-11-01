"use client";

import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Step, Run } from "../types/workflow";

type ApiRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

type UseWorkflowDetailsOptions = {
  request: ApiRequest;
  activeTokenRef: MutableRefObject<string>;
  workspaceId: string;
  workflowId: string;
};

export function useWorkflowDetails({
  request,
  activeTokenRef,
  workspaceId,
  workflowId,
}: UseWorkflowDetailsOptions) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  const requestVersionRef = useRef(0);
  const runRequestVersionRef = useRef(0);

  // Keep track of the currently selected workflow.
  const currentSelectionRef = useRef({
    workspaceId,
    workflowId,
  });

  currentSelectionRef.current = {
    workspaceId,
    workflowId,
  };

  // Invalidate pending requests and clear workflow details.
  const resetWorkflowDetails = useCallback(() => {
    requestVersionRef.current += 1;
    runRequestVersionRef.current += 1;

    setSteps([]);
    setRuns([]);
    setSelectedRun(null);
  }, []);

  // Load steps and execution history for the selected workflow.
  const loadWorkflowDetails = useCallback(async () => {
    if (!workspaceId || !workflowId) return;

    const sessionToken = activeTokenRef.current;
    const requestVersion = requestVersionRef.current;
    const requestedWorkspaceId = workspaceId;
    const requestedWorkflowId = workflowId;

    const root = `/workspaces/${requestedWorkspaceId}/workflows/${requestedWorkflowId}`;

    const [stepData, runData] = await Promise.all([
      request<Step[]>(`${root}/steps`),
      request<Run[]>(`${root}/runs`),
    ]);

    if (
      activeTokenRef.current !== sessionToken ||
      requestVersionRef.current !== requestVersion ||
      currentSelectionRef.current.workspaceId !== requestedWorkspaceId ||
      currentSelectionRef.current.workflowId !== requestedWorkflowId
    ) {
      return;
    }

    setSteps(stepData);
    setRuns(runData);
  }, [request, activeTokenRef, workspaceId, workflowId]);

  // Load details of a specific workflow execution.
  const loadRunDetails = useCallback(
    async (runId: string) => {
      const runRequestVersion = ++runRequestVersionRef.current;

      if (selectedRun?.id === runId) {
        setSelectedRun(null);
        return;
      }

      if (!workspaceId || !workflowId) return;

      const sessionToken = activeTokenRef.current;
      const requestVersion = requestVersionRef.current;
      const requestedWorkspaceId = workspaceId;
      const requestedWorkflowId = workflowId;

      const data = await request<Run>(
        `/workspaces/${requestedWorkspaceId}/workflows/${requestedWorkflowId}/runs/${runId}`,
      );

      if (
        activeTokenRef.current !== sessionToken ||
        requestVersionRef.current !== requestVersion ||
        runRequestVersionRef.current !== runRequestVersion ||
        currentSelectionRef.current.workspaceId !== requestedWorkspaceId ||
        currentSelectionRef.current.workflowId !== requestedWorkflowId
      ) {
        return;
      }

      setSelectedRun(data);
    },
    [request, activeTokenRef, workspaceId, workflowId, selectedRun],
  );

  return {
    steps,
    runs,
    selectedRun,
    setSelectedRun,
    loadWorkflowDetails,
    loadRunDetails,
    resetWorkflowDetails,
  };
}
