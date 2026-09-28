"use client";

import { useCallback, useState } from "react";

import { listMaterials, listTopics, processMaterial } from "../lib/api";

export type OpenMaterialDialogOptions = {
  subjectId?: string;
  topicId?: string;
};

export function useMaterials(setSubjectMaterials: (subjectId: string, count: number) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedSubjectId, setPreselectedSubjectId] = useState<string | null>(null);
  const [preselectedTopicId, setPreselectedTopicId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [reloadSignal, setReloadSignal] = useState(0);

  const open = useCallback((options?: OpenMaterialDialogOptions) => {
    if (options?.subjectId) setPreselectedSubjectId(options.subjectId);
    if (options?.topicId) setPreselectedTopicId(options.topicId);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPreselectedSubjectId(null);
    setPreselectedTopicId(null);
  }, []);

  const preselectSubject = useCallback((subjectId: string) => {
    setPreselectedSubjectId(subjectId);
  }, []);

  const reloadMaterials = useCallback(() => {
    setReloadSignal((current) => current + 1);
  }, []);

  /**
   * Procesa un material en segundo plano y avisa al listado para que se refresque
   * al terminar. El `POST /materials/:id/process` no falla ante un error de la IA:
   * devuelve el material ya en `FAILED`, y su error lo muestra el propio listado.
   * Solo un fallo de la petición deja el material en `PENDING`, reintentable
   * con el botón "Procesar".
   */
  const startProcessing = useCallback(async (materialId: string): Promise<void> => {
    setProcessingIds((current) =>
      current.includes(materialId) ? current : [...current, materialId]
    );
    try {
      await processMaterial(materialId);
    } catch {
      // El material queda PENDING o FAILED y el listado se encarga de mostrarlo.
    } finally {
      setProcessingIds((current) => current.filter((id) => id !== materialId));
      setReloadSignal((current) => current + 1);
    }
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

  return {
    isOpen,
    open,
    close,
    preselectSubject,
    preselectedSubjectId,
    preselectedTopicId,
    processingIds,
    reloadMaterials,
    reloadSignal,
    refreshSubjectMaterialCount,
    startProcessing
  };
}
