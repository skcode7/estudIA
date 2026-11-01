"use client";

import { useCallback, useEffect, useState } from "react";

import { type ApiUser, createUser, listUsers, signIn } from "../lib/api";
import { clearSession, getSession, setSession } from "../lib/auth-session";

export function useUser() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userError, setUserError] = useState("");
  const [apiError, setApiError] = useState("");

  const ensureLocalUser = useCallback(async (login: string): Promise<ApiUser> => {
    const users = await listUsers();
    const existing = users.find((u) => u.name === login);
    if (existing) return existing;
    return createUser({ name: login });
  }, []);

  const loadUser = useCallback(async (): Promise<void> => {
    setIsUserLoading(true);
    setUserError("");
    setApiError("");
    try {
      const session = getSession();
      if (!session) {
        setUser(null);
        setIsUserModalOpen(true);
        return;
      }
      const local = await ensureLocalUser(session.login);
      setUser(local);
      setIsUserModalOpen(false);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo conectar con la API.");
      setIsUserModalOpen(true);
    } finally {
      setIsUserLoading(false);
    }
  }, [ensureLocalUser]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadUser();
    });
  }, [loadUser]);

  const submitLogin = useCallback(
    async (login: string, password: string, remember: boolean): Promise<void> => {
      if (isUserLoading) return;
      const trimmedLogin = login.trim();
      if (!trimmedLogin || !password) return;
      setIsSavingUser(true);
      setUserError("");
      try {
        const result = await signIn({ login: trimmedLogin, password });
        setSession({ sessionId: result.sessionId, login: trimmedLogin }, remember);
        const local = await ensureLocalUser(trimmedLogin);
        setUser(local);
        setIsUserModalOpen(false);
        setApiError("");
      } catch (error) {
        setUserError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
      } finally {
        setIsSavingUser(false);
      }
    },
    [isUserLoading, ensureLocalUser]
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setIsUserModalOpen(true);
  }, []);

  const needsOnboarding = isUserModalOpen && !apiError;

  return {
    user,
    isUserLoading,
    isUserModalOpen,
    isSavingUser,
    userError,
    apiError,
    needsOnboarding,
    submitLogin,
    logout,
    retryLoadUser: loadUser
  };
}