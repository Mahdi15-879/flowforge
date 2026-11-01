"use client";

import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Workspace } from "../types/workflow";

type ApiRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

type UseWorkspacesOptions = {
  request: ApiRequest;
  activeTokenRef: MutableRefObject<string>;
};

const STORAGE_KEY = "flowforge:selectedWorkspace";

export function useWorkspaces({
  request,
  activeTokenRef,
}: UseWorkspacesOptions) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceIdState] = useState("");

  const workspaceRequestVersionRef = useRef(0);

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id);

    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

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

    const savedId = localStorage.getItem(STORAGE_KEY);

    setWorkspaceIdState((current) => {
      const preferredId = current || savedId || "";

      return normalized.some((item) => item.id === preferredId)
        ? preferredId
        : (normalized[0]?.id ?? "");
    });
  }, [request, activeTokenRef]);

  const resetWorkspaces = useCallback(() => {
    workspaceRequestVersionRef.current += 1;

    setWorkspaces([]);
    setWorkspaceIdState("");
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
