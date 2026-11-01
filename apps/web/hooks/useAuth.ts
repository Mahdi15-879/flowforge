"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api-client";
import {
  getSessionToken,
  saveSessionToken,
  removeSessionToken,
} from "../lib/session";

type AuthMode = "login" | "register";

type AuthCredentials = {
  email: string;
  password: string;
  name?: string;
};

type AuthResponse = {
  accessToken?: string;
  access_token?: string;
  token?: string;
};

export function useAuth() {
  const [token, setToken] = useState("");
  const activeTokenRef = useRef("");

  const setSession = useCallback((accessToken: string) => {
    saveSessionToken(accessToken);
    activeTokenRef.current = accessToken;
    setToken(accessToken);
  }, []);

  const clearAuth = useCallback(() => {
    removeSessionToken();
    activeTokenRef.current = "";
    setToken("");
  }, []);

  const authenticate = useCallback(
    async (mode: AuthMode, credentials: AuthCredentials) => {
      const payload =
        mode === "register"
          ? {
              email: credentials.email,
              password: credentials.password,
              ...(credentials.name?.trim() ? { name: credentials.name } : {}),
            }
          : {
              email: credentials.email,
              password: credentials.password,
            };

      const result = await apiRequest<AuthResponse>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const accessToken =
        result.accessToken ?? result.access_token ?? result.token;

      if (accessToken) {
        setSession(accessToken);
      }

      return accessToken ?? null;
    },
    [setSession],
  );

  useEffect(() => {
    const saved = getSessionToken();

    if (saved) {
      activeTokenRef.current = saved;
      setToken(saved);
    }
  }, []);

  return {
    token,
    activeTokenRef,
    authenticate,
    clearAuth,
  };
}
