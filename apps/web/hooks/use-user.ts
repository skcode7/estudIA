"use client";

import { useCallback, useEffect, useState } from "react";

import { type ApiUser, createUser, listUsers } from "../lib/api";

export function useUser() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userError, setUserError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUser(): Promise<void> {
      try {
        const users = await listUsers();
        if (cancelled) return;
        if (users.length > 0) {
          setUser(users[0]);
        } else {
          setIsUserModalOpen(true);
        }
      } catch {
        if (cancelled) return;
        setIsUserModalOpen(true);
      } finally {
        if (!cancelled) setIsUserLoading(false);
      }
    }

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveUser = useCallback(async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSavingUser(true);
    setUserError("");
    try {
      const created = await createUser({ name: trimmed });
      setUser(created);
      setIsUserModalOpen(false);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "No se pudo guardar el nombre.");
    } finally {
      setIsSavingUser(false);
    }
  }, []);

  return { user, isUserLoading, isUserModalOpen, isSavingUser, userError, saveUser };
}