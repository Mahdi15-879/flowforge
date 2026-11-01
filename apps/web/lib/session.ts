const TOKEN_KEY = "flowforge_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function saveSessionToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function removeSessionToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}
