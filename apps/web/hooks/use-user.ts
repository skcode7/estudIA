"use client";

import { useCallback, useEffect, useState } from "react";

import { type ApiUser, createUser, listUsers } from "../lib/api";

export function useUser() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userError, setUserError] = useState("");
  const [apiError, setApiError] = useState("");

  const loadUser = useCallback(async (): Promise<void> => {
    setIsUserLoading(true);
    setUserError("");
    setApiError("");
    try {
      const users = await listUsers();
      if (users.length > 0) {
        setUser(users[0]);
        setIsUserModalOpen(false);
      } else {
        setUser(null);
        setIsUserModalOpen(true);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo conectar con la API.");
      setIsUserModalOpen(true);
    } finally {
      setIsUserLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const saveUser = useCallback(async (name: string): Promise<void> => {
    if (isUserLoading) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSavingUser(true);
    setUserError("");
    try {
      const created = await createUser({ name: trimmed });
      setUser(created);
      setIsUserModalOpen(false);
      setApiError("");
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "No se pudo guardar el nombre.");
    } finally {
      setIsSavingUser(false);
    }
  }, [isUserLoading]);

  const needsOnboarding = isUserModalOpen && !apiError;

  return {
    user,
    isUserLoading,
    isUserModalOpen,
    isSavingUser,
    userError,
    apiError,
    needsOnboarding,
    saveUser,
    retryLoadUser: loadUser
  };
}
