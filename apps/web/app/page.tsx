"use client";

import { useCallback, useState } from "react";

import { AppShell } from "../components/layout/app-shell";
import { DeleteSubjectDialog } from "../components/dialogs/delete-subject-dialog";
import { MaterialDialog, type MaterialCreated } from "../components/dialogs/material-dialog";
import { SubjectDialog } from "../components/dialogs/subject-dialog";
import { UserOnboardingDialog } from "../components/dialogs/user-onboarding-dialog";
import { HomeView } from "../components/views/home-view";
import { MaterialsView } from "../components/views/materials-view";
import { PlaceholderView } from "../components/views/placeholder-view";
import { SubjectsView } from "../components/views/subjects-view";
import { useMaterials } from "../hooks/use-materials";
import { useSubjects } from "../hooks/use-subjects";
import { useUser } from "../hooks/use-user";
import { navLabel, type NavItemId } from "../lib/navigation";
import { processMaterial } from "../lib/api";

export default function HomePage() {
  const [notice, setNotice] = useState("");
  const [activeView, setActiveView] = useState<NavItemId>("home");

  const user = useUser();
  const subjects = useSubjects(setNotice);
  const materials = useMaterials(subjects.setSubjectMaterials);

  const openSubjects = useCallback(() => {
    setActiveView("subjects");
    setNotice("");
  }, []);

  const openCreateSubject = useCallback(() => {
    subjects.openCreateDialog();
    setNotice("");
  }, [subjects]);

  const processMaterialWithAI = useCallback(
    async (created: MaterialCreated): Promise<void> => {
      const { subjectId, material } = created;
      await materials.refreshSubjectMaterialCount(subjectId);
      setNotice(`Procesando "${material.title}" con IA…`);
      try {
        const processed = await processMaterial(material.id);
        setNotice(
          processed.processingStatus === "COMPLETED"
            ? `"${processed.title}" procesado: ${processed.questionCount} ${
                processed.questionCount === 1 ? "pregunta" : "preguntas"
              } generadas.`
            : `La IA no pudo procesar "${material.title}". Revisa su estado en Materiales.`
        );
      } catch {
        setNotice(
          `El material se guardó en ${created.subjectName}, pero la IA falló. Reintenta desde Materiales.`
        );
      }
      await materials.refreshSubjectMaterialCount(subjectId);
    },
    [materials]
  );

  const handleCreateSubject = useCallback(
    async (values: { name: string; description: string }) => {
      const created = await subjects.addSubject(values);
      if (created) {
        materials.preselectSubject(created.id);
      }
    },
    [subjects, materials]
  );

  return (
    <>
      {(user.isUserLoading || user.isUserModalOpen) && (
        <UserOnboardingDialog
          error={user.userError}
          isSaving={user.isSavingUser}
          onSubmit={user.saveUser}
        />
      )}

      <AppShell
        activeView={activeView}
        onNavigate={setActiveView}
        openMaterialDialog={materials.open}
        userName={user.user?.name ?? ""}
      >
        {activeView === "home" ? (
          <HomeView
            isLoading={subjects.isLoading}
            loadError={subjects.loadError}
            notice={notice}
            openMaterialDialog={materials.open}
            openSubjectDialog={openCreateSubject}
            subjects={subjects.subjects}
            userName={user.user?.name ?? ""}
          />
        ) : activeView === "subjects" ? (
          <SubjectsView
            filter={subjects.filter}
            isLoading={subjects.isLoading}
            loadError={subjects.loadError}
            notice={notice}
            onFilterChange={subjects.setFilter}
            openDeleteDialog={subjects.openDeleteDialog}
            openEditDialog={subjects.openEditDialog}
            openSubjectDialog={openCreateSubject}
            subjects={subjects.filteredSubjects}
          />
        ) : activeView === "materials" ? (
          <MaterialsView
            onSubjectMaterialsChange={(subjectId) =>
              void materials.refreshSubjectMaterialCount(subjectId)
            }
            subjects={subjects.subjects}
          />
        ) : (
          <PlaceholderView title={navLabel(activeView)} />
        )}
      </AppShell>

      {subjects.isCreateDialogOpen && (
        <SubjectDialog
          error={subjects.createError}
          isSubmitting={subjects.isCreating}
          key="create"
          mode="create"
          onCancel={subjects.closeCreateDialog}
          onSubmit={handleCreateSubject}
        />
      )}

      {subjects.isEditDialogOpen && subjects.editingSubject && (
        <SubjectDialog
          error={subjects.editError}
          isSubmitting={subjects.isSaving}
          key={subjects.editingSubject.id}
          mode="edit"
          onCancel={subjects.closeEditDialog}
          onSubmit={subjects.saveSubject}
          subject={subjects.editingSubject}
        />
      )}

      {subjects.isDeleteDialogOpen && subjects.deletingSubject && (
        <DeleteSubjectDialog
          error={subjects.deleteError}
          isDeleting={subjects.isDeleting}
          onCancel={subjects.closeDeleteDialog}
          onConfirm={() => void subjects.confirmDelete()}
          subject={subjects.deletingSubject}
        />
      )}

      {materials.isOpen && (
        <MaterialDialog
          onClose={materials.close}
          onCreated={async (created, useAi) => {
            materials.close();
            if (useAi) {
              void processMaterialWithAI(created);
            } else {
              await materials.refreshSubjectMaterialCount(created.subjectId);
              setNotice(`Material añadido a ${created.subjectName}.`);
            }
          }}
          preselectedSubjectId={materials.preselectedSubjectId}
          subjects={subjects.subjects}
        />
      )}
    </>
  );
}