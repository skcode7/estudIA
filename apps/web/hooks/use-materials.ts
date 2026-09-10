"use client";

import { useCallback, useState } from "react";

import { listMaterials, listTopics } from "../lib/api";

export function useMaterials(setSubjectMaterials: (subjectId: string, count: number) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedSubjectId, setPreselectedSubjectId] = useState<string | null>(null);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPreselectedSubjectId(null);
  }, []);

  const preselectSubject = useCallback((subjectId: string) => {
    setPreselectedSubjectId(subjectId);
  }, []);

  const refreshSubjectMaterialCount = useCallback(
    async (subjectId: string): Promise<void> => {
      try {
        const topics = await listTopics(subjectId);
        const materialsPerTopic = await Promise.all(topics.map((topic) => listMaterials(topic.id)));
        const total = materialsPerTopic.reduce((acc, materials) => acc + materials.length, 0);
        setSubjectMaterials(subjectId, total);
      } catch {
        // El contador queda como está si falla la consulta.
      }
    },
    [setSubjectMaterials]
  );

  return { isOpen, open, close, preselectSubject, preselectedSubjectId, refreshSubjectMaterialCount };
}