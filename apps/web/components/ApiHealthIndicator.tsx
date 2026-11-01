"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  LoaderCircle,
  RefreshCw,
  WifiOff,
} from "lucide-react";

type HealthStatus =
  | "checking"
  | "operational"
  | "database-offline"
  | "api-offline";

type ApiHealth = {
  status: "ok";
  service: "flowforge-api";
  timestamp: string;
};

type DatabaseHealth = {
  status: "ok";
  database: "connected";
};

async function checkEndpoint(
  path: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`/backend/${path}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json();
}

function isApiHealthy(value: unknown): value is ApiHealth {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;

  return (
    data.status === "ok" &&
    data.service === "flowforge-api" &&
    typeof data.timestamp === "string" &&
    !Number.isNaN(Date.parse(data.timestamp))
  );
}

function isDatabaseHealthy(value: unknown): value is DatabaseHealth {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;

  return data.status === "ok" && data.database === "connected";
}

export function ApiHealthIndicator() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setRetryKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);

    async function checkHealth() {
      setStatus("checking");

      try {
        const apiResponse = await checkEndpoint("health", controller.signal);

        if (cancelled) return;

        if (!isApiHealthy(apiResponse)) {
          setStatus("api-offline");
          return;
        }

        try {
          const databaseResponse = await checkEndpoint(
            "health/database",
            controller.signal,
          );

          if (cancelled) return;

          setStatus(
            isDatabaseHealthy(databaseResponse)
              ? "operational"
              : "database-offline",
          );
        } catch {
          if (cancelled) return;

          setStatus("database-offline");
        }
      } catch {
        if (cancelled) return;

        setStatus("api-offline");
      } finally {
        clearTimeout(timeout);
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [retryKey]);

  const config = {
    checking: {
      label: "Checking services",
      icon: LoaderCircle,
      className: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    },
    operational: {
      label: "All systems operational",
      icon: CheckCircle2,
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    },
    "database-offline": {
      label: "Database unavailable",
      icon: Database,
      className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    },
    "api-offline": {
      label: "API offline",
      icon: WifiOff,
      className: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    },
  } satisfies Record<
    HealthStatus,
    {
      label: string;
      icon: typeof CircleAlert;
      className: string;
    }
  >;

  const current = config[status];
  const Icon = current.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${current.className}`}
    >
      <Icon
        size={15}
        className={status === "checking" ? "animate-spin" : ""}
        aria-hidden="true"
      />

      <span>{current.label}</span>

      {status !== "checking" && (
        <button
          type="button"
          onClick={retry}
          aria-label="Check service health again"
          title="Check again"
          className="ml-1 rounded-full p-1 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <RefreshCw size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
