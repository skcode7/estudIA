"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createSubject, deleteSubject, listSubjects, updateSubject } from "../lib/api";
import { decorateSubject, type Subject } from "../lib/subjects";

export interface SubjectFormValues {
  name: string;
  description: string;
}

export function useSubjects(setNotice: (message: string) => void) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const apiSubjects = await listSubjects();
        if (cancelled) return;
        setSubjects(apiSubjects.map(decorateSubject));
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "No se pudieron cargar tus materias.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSubjects = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false)
    );
  }, [subjects, filter]);

  const openCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(true);
    setCreateError("");
  }, []);

  const closeCreateDialog = useCallback(() => setIsCreateDialogOpen(false), []);

  const openEditDialog = useCallback((subject: Subject) => {
    setEditingSubject(subject);
    setEditError("");
    setIsEditDialogOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => setIsEditDialogOpen(false), []);

  const openDeleteDialog = useCallback((subject: Subject) => {
    setDeletingSubject(subject);
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => setIsDeleteDialogOpen(false), []);

  const addSubject = useCallback(
    async (values: SubjectFormValues): Promise<Subject | undefined> => {
      const name = values.name.trim();
      if (!name) return undefined;
      setIsCreating(true);
      setCreateError("");
      try {
        const created = await createSubject({
          name,
          description: values.description.trim() || undefined
        });
        const subject = decorateSubject(created, subjects.length);
        setSubjects((current) => [...current, subject]);
        setIsCreateDialogOpen(false);
        setNotice(`"${name}" se agregó a tus materias.`);
        return subject;
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "No se pudo crear la materia.");
        return undefined;
      } finally {
        setIsCreating(false);
      }
    },
    [subjects.length, setNotice]
  );

  const saveSubject = useCallback(
    async (values: SubjectFormValues): Promise<void> => {
      if (!editingSubject) return;
      const name = values.name.trim();
      if (!name) return;
      setIsSaving(true);
      setEditError("");
      try {
        const updated = await updateSubject(editingSubject.id, {
          name,
          description: values.description.trim() || undefined
        });
        setSubjects((current) =>
          current.map((s) =>
            s.id === editingSubject.id ? decorateSubject(updated, current.indexOf(s)) : s
          )
        );
        setIsEditDialogOpen(false);
        setEditingSubject(null);
        setNotice(`"${name}" se actualizó correctamente.`);
      } catch (error) {
        setEditError(error instanceof Error ? error.message : "No se pudo actualizar la materia.");
      } finally {
        setIsSaving(false);
      }
    },
    [editingSubject, setNotice]
  );

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!deletingSubject) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteSubject(deletingSubject.id);
      setSubjects((current) => current.filter((s) => s.id !== deletingSubject.id));
      setIsDeleteDialogOpen(false);
      setDeletingSubject(null);
      setNotice(`"${deletingSubject.name}" se eliminó.`);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar la materia.");
    } finally {
      setIsDeleting(false);
    }
  }, [deletingSubject, setNotice]);

  const setSubjectMaterials = useCallback((subjectId: string, count: number) => {
    setSubjects((current) =>
      current.map((s) => (s.id === subjectId ? { ...s, materials: count } : s))
    );
  }, []);

  return {
    subjects,
    filteredSubjects,
    isLoading,
    loadError,
    filter,
    setFilter,
    isCreateDialogOpen,
    createError,
    isCreating,
    openCreateDialog,
    closeCreateDialog,
    editingSubject,
    isEditDialogOpen,
    isSaving,
    editError,
    openEditDialog,
    closeEditDialog,
    deletingSubject,
    isDeleteDialogOpen,
    isDeleting,
    deleteError,
    openDeleteDialog,
    closeDeleteDialog,
    addSubject,
    saveSubject,
    confirmDelete,
    setSubjectMaterials
  };
}