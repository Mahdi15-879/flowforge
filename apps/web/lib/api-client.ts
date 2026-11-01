const BASE = "/backend";

export const SESSION_EXPIRED = "SESSION_EXPIRED";

type ApiRequestOptions = {
  token?: string;
  onUnauthorized?: () => void;
  isSessionCurrent?: () => boolean;
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  auth: ApiRequestOptions = {},
): Promise<T> {
  const { token, onUnauthorized, isSessionCurrent } = auth;
  const isAuthRequest = path.startsWith("/auth/");

  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !isAuthRequest) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!isAuthRequest && token) {
    if (isSessionCurrent && !isSessionCurrent()) {
      throw new Error(SESSION_EXPIRED);
    }

    if (response.status === 401) {
      onUnauthorized?.();
      throw new Error(SESSION_EXPIRED);
    }
  }

  const text = await response.text();

  if (!isAuthRequest && token && isSessionCurrent && !isSessionCurrent()) {
    throw new Error(SESSION_EXPIRED);
  }

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
}
