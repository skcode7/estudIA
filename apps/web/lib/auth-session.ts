export interface StoredSession {
  sessionId: string;
  login: string;
}

const COOKIE_NAME = "estudia_session";
const SESSION_KEY = "estudia_session";
const MAX_AGE_SECONDS = 14 * 24 * 60 * 60; // 2 semanas

function parse(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (parsed && typeof parsed.sessionId === "string" && typeof parsed.login === "string") {
      return { sessionId: parsed.sessionId, login: parsed.login };
    }
  } catch {
    // legacy: raw sessionId sin login
  }
  return null;
}

export function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null;

  // 1) cookie (recuérdame)
  const cookieMatch = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (cookieMatch) {
    const value = cookieMatch.slice(COOKIE_NAME.length + 1);
    if (value) {
      const parsed = parse(decodeURIComponent(value));
      if (parsed) return parsed;
    }
  }

  // 2) sessionStorage (solo pestaña)
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    const parsed = parse(v);
    if (parsed) return parsed;
  } catch {
    // ignore
  }

  return null;
}

export function getSessionId(): string | null {
  return getSession()?.sessionId ?? null;
}

export function setSession(session: StoredSession, remember: boolean): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(session);
  if (remember) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(payload)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  } else {
    try {
      sessionStorage.setItem(SESSION_KEY, payload);
    } catch {
      // ignore
    }
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}