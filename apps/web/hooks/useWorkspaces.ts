"use client";

import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Workspace } from "../types/workflow";

type ApiRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

type UseWorkspacesOptions = {
  request: ApiRequest;
  activeTokenRef: MutableRefObject<string>;
};

export function useWorkspaces({
  request,
  activeTokenRef,
}: UseWorkspacesOptions) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const workspaceRequestVersionRef = useRef(0);

  const loadWorkspaces = useCallback(async () => {
    const requestVersion = workspaceRequestVersionRef.current;
    const sessionToken = activeTokenRef.current;

    const data = await request<Workspace[]>("/workspaces");

    if (
      activeTokenRef.current !== sessionToken ||
      workspaceRequestVersionRef.current !== requestVersion
    ) {
      return;
    }

    const normalized = data.map((item) =>
      item.workspace
        ? {
            ...item.workspace,
            role: item.role ?? item.membership?.role,
          }
        : item,
    );

    setWorkspaces(normalized);

    setWorkspaceId((current) =>
      normalized.some((item) => item.id === current)
        ? current
        : (normalized[0]?.id ?? ""),
    );
  }, [request, activeTokenRef]);

  const resetWorkspaces = useCallback(() => {
    workspaceRequestVersionRef.current += 1;
    setWorkspaces([]);
    setWorkspaceId("");
  }, []);

  return {
    workspaces,
    setWorkspaces,
    workspaceId,
    setWorkspaceId,
    loadWorkspaces,
    resetWorkspaces,
  };
}
