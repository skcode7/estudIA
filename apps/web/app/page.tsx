"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import {
  createUser,
  createSubject,
  deleteSubject,
  listSubjects,
  listUsers,
  updateSubject,
  type ApiSubject,
  type ApiUser
} from "../lib/api";

type Subject = ApiSubject & {
  progress: number;
  materials: number;
  icon: string;
  iconBackground: string;
  progressColor: string;
  message: string;
};

const navItems = [
  ["home", "⌂", "Inicio"],
  ["subjects", "▤", "Mis materias"],
  ["quiz", "?", "Quiz"],
  ["review", "↻", "Repaso"],
  ["progress", "▥", "Progreso"],
  ["badges", "♜", "Insignias"]
] as const;

const colorOptions = [
  { iconBackground: "bg-emerald-100 text-emerald-600", progressColor: "bg-emerald-500", icon: "√" },
  { iconBackground: "bg-blue-100 text-blue-600", progressColor: "bg-blue-500", icon: "⚗" },
  { iconBackground: "bg-orange-100 text-orange-600", progressColor: "bg-orange-500", icon: "⌂" },
  { iconBackground: "bg-violet-100 text-violet-600", progressColor: "bg-violet-500", icon: "▤" }
];

function decorateSubject(subject: ApiSubject, index: number): Subject {
  const color = colorOptions[index % colorOptions.length];
  return {
    ...subject,
    progress: 0,
    materials: 0,
    icon: color.icon,
    iconBackground: color.iconBackground,
    progressColor: color.progressColor,
    message: "Tu materia está lista para estudiar ✨"
  };
}

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [createError, setCreateError] = useState("");
  const [activeView, setActiveView] = useState("home");
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");
  const [materialSubjectId, setMaterialSubjectId] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [notice, setNotice] = useState("");

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [subjectsFilter, setSubjectsFilter] = useState("");

  const [user, setUser] = useState<ApiUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userError, setUserError] = useState("");

  const filteredSubjects = useMemo(() => {
    const q = subjectsFilter.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false)
    );
  }, [subjects, subjectsFilter]);

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

  async function saveUser(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = userName.trim();
    if (!name) return;
    setIsSavingUser(true);
    setUserError("");
    try {
      const created = await createUser({ name });
      setUser(created);
      setIsUserModalOpen(false);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "No se pudo guardar el nombre.");
    } finally {
      setIsSavingUser(false);
    }
  }

  function openSubjects(): void {
    setActiveView("subjects");
    setNotice("");
  }

  function openSubjectDialog(): void {
    setIsSubjectDialogOpen(true);
    setNotice("");
    setCreateError("");
    setNewSubjectName("");
    setNewSubjectDescription("");
  }

  async function addSubject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = newSubjectName.trim();
    if (!name) return;
    setIsCreating(true);
    setCreateError("");
    try {
      const created = await createSubject({
        name,
        description: newSubjectDescription.trim() || undefined
      });
      const subject = decorateSubject(created, subjects.length);
      setSubjects((current) => [...current, subject]);
      setMaterialSubjectId(subject.id);
      setNewSubjectName("");
      setNewSubjectDescription("");
      setIsSubjectDialogOpen(false);
      setNotice(`"${name}" se agregó a tus materias.`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "No se pudo crear la materia.");
    } finally {
      setIsCreating(false);
    }
  }

  function openEditDialog(subject: Subject): void {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditDescription(subject.description ?? "");
    setEditError("");
    setIsEditDialogOpen(true);
  }

  async function saveSubject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editingSubject) return;
    const name = editName.trim();
    if (!name) return;
    setIsSaving(true);
    setEditError("");
    try {
      const updated = await updateSubject(editingSubject.id, {
        name,
        description: editDescription.trim() || undefined
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
  }

  function openDeleteDialog(subject: Subject): void {
    setDeletingSubject(subject);
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  }

  async function confirmDelete(): Promise<void> {
    if (!deletingSubject) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteSubject(deletingSubject.id);
      setSubjects((current) => current.filter((s) => s.id !== deletingSubject.id));
      setIsDeleteDialogOpen(false);
      setNotice(`"${deletingSubject.name}" se eliminó.`);
      setDeletingSubject(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar la materia.");
    } finally {
      setIsDeleting(false);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>): void {
    setSelectedFileName(event.target.files?.[0]?.name ?? "");
  }

  function addMaterial(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!materialSubjectId || (!materialTitle.trim() && !selectedFileName && !materialContent.trim())) return;
    const selectedSubject = subjects.find((subject) => subject.id === materialSubjectId);
    setSubjects((currentSubjects) =>
      currentSubjects.map((subject) =>
        subject.id === materialSubjectId
          ? { ...subject, materials: subject.materials + 1 }
          : subject
      )
    );
    setNotice(`Material añadido a ${selectedSubject?.name ?? "la materia"}.`);
    setMaterialTitle("");
    setMaterialContent("");
    setSelectedFileName("");
    setIsMaterialDialogOpen(false);
  }

  const currentNavItem = navItems.find(([id]) => id === activeView)?.[2] ?? "Inicio";

  return (
    <main className="min-h-screen bg-[#f8f7fc] pb-24 text-[#1e1b2e] lg:pb-0">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-7 lg:flex">
          <button
            className="flex items-center gap-2 px-3 text-left"
            onClick={() => setActiveView("home")}
            type="button"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-[#6d4aff] text-xl text-white"
            >
              🤖
            </span>
            <span className="text-2xl font-bold tracking-tight">
              estud<span className="text-[#6d4aff]">IA</span>
            </span>
          </button>
          <nav aria-label="Navegación principal" className="mt-10 space-y-2">
            {navItems.map(([id, icon, label]) => (
              <button
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  activeView === id
                    ? "bg-[#f1eeff] font-semibold text-[#6d4aff]"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
                key={id}
                onClick={() => setActiveView(id)}
                type="button"
              >
                <span aria-hidden="true" className="grid size-5 place-items-center text-lg">
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-7 border-t border-slate-100 pt-5">
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-[#f1eeff] hover:text-[#6d4aff]"
              onClick={() => setIsMaterialDialogOpen(true)}
              type="button"
            >
              <span aria-hidden="true" className="text-xl">
                ⊕
              </span>
              Agregar material
            </button>
          </div>
          <div className="mt-auto rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full bg-violet-100 text-xl"
              >
                🧑‍🎓
              </span>
              <div>
                <p className="text-sm font-bold">{user?.name ?? ""}</p>
                <p className="text-xs text-[#6d4aff]">Nivel 8</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-[77%] rounded-full bg-[#6d4aff]" />
            </div>
            <p className="mt-2 text-xs text-slate-500">1,240 / 1,600 XP</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-8 lg:py-9">
          {activeView === "home" ? (
            <HomeView
              notice={notice}
              subjects={subjects}
              isLoading={isLoading}
              loadError={loadError}
              userName={user?.name ?? ""}
              openSubjects={openSubjects}
              openSubjectDialog={openSubjectDialog}
              openMaterialDialog={() => setIsMaterialDialogOpen(true)}
            />
          ) : activeView === "subjects" ? (
            <SubjectsView
              notice={notice}
              subjects={filteredSubjects}
              isLoading={isLoading}
              loadError={loadError}
              filter={subjectsFilter}
              onFilterChange={setSubjectsFilter}
              openSubjectDialog={openSubjectDialog}
              openEditDialog={openEditDialog}
              openDeleteDialog={openDeleteDialog}
            />
          ) : (
            <section className="grid min-h-[60vh] place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <div>
                <span aria-hidden="true" className="text-4xl">
                  ✦
                </span>
                <h1 className="mt-4 text-xl font-bold">{currentNavItem}</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Esta sección estará disponible próximamente.
                </p>
              </div>
            </section>
          )}
        </section>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-20 flex h-20 items-center justify-around border-t border-slate-100 bg-white px-2 lg:hidden"
      >
        {navItems.slice(0, 4).map(([id, icon, label]) => (
          <button
            className={`grid min-h-12 min-w-12 place-items-center gap-0.5 rounded-xl px-2 text-xs ${
              activeView === id ? "font-bold text-[#6d4aff]" : "text-slate-500"
            }`}
            key={id}
            onClick={() => setActiveView(id)}
            type="button"
          >
            <span className="text-lg">{icon}</span>
            {label}
          </button>
        ))}
        <button
          aria-label="Agregar material"
          className="-mt-9 grid size-14 place-items-center rounded-full bg-[#6d4aff] text-2xl text-white shadow-lg shadow-violet-300"
          onClick={() => setIsMaterialDialogOpen(true)}
          type="button"
        >
          🤖
        </button>
      </nav>

      {isSubjectDialogOpen && (
        <Dialog onClose={() => setIsSubjectDialogOpen(false)} title="Nueva materia">
          <form className="space-y-5" onSubmit={addSubject}>
            <label className="block text-sm font-semibold" htmlFor="subject-name">
              Nombre de la materia
              <input
                autoFocus
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="subject-name"
                onChange={(event) => setNewSubjectName(event.target.value)}
                placeholder="Ej. Inglés"
                required
                value={newSubjectName}
              />
            </label>
            <label className="block text-sm font-semibold" htmlFor="subject-description">
              Descripción (opcional)
              <textarea
                className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="subject-description"
                onChange={(event) => setNewSubjectDescription(event.target.value)}
                placeholder="Ej. Idioma moderno, nivel B2"
                value={newSubjectDescription}
              />
            </label>
            {createError && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                {createError}
              </p>
            )}
            <DialogActions
              disabled={isCreating}
              onCancel={() => setIsSubjectDialogOpen(false)}
              submitLabel={isCreating ? "Creando…" : "Crear materia"}
            />
          </form>
        </Dialog>
      )}

      {isEditDialogOpen && editingSubject && (
        <Dialog onClose={() => setIsEditDialogOpen(false)} title="Editar materia">
          <form className="space-y-5" onSubmit={saveSubject}>
            <label className="block text-sm font-semibold" htmlFor="edit-name">
              Nombre de la materia
              <input
                autoFocus
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="edit-name"
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Ej. Inglés"
                required
                value={editName}
              />
            </label>
            <label className="block text-sm font-semibold" htmlFor="edit-description">
              Descripción (opcional)
              <textarea
                className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="edit-description"
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Ej. Idioma moderno, nivel B2"
                value={editDescription}
              />
            </label>
            {editError && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                {editError}
              </p>
            )}
            <DialogActions
              disabled={isSaving}
              onCancel={() => setIsEditDialogOpen(false)}
              submitLabel={isSaving ? "Guardando…" : "Guardar cambios"}
            />
          </form>
        </Dialog>
      )}

      {isDeleteDialogOpen && deletingSubject && (
        <Dialog onClose={() => setIsDeleteDialogOpen(false)} title="Eliminar materia">
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que quieres eliminar <strong>&quot;{deletingSubject.name}&quot;</strong>?
              Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                onClick={() => setIsDeleteDialogOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
                onClick={confirmDelete}
                type="button"
              >
                {isDeleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {isMaterialDialogOpen && (
        <Dialog onClose={() => setIsMaterialDialogOpen(false)} title="Agregar material">
          <form className="space-y-4" onSubmit={addMaterial}>
            <label className="block text-sm font-semibold" htmlFor="material-subject">
              Materia
              <select
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="material-subject"
                onChange={(event) => setMaterialSubjectId(event.target.value)}
                value={materialSubjectId}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold" htmlFor="material-title">
              Título
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="material-title"
                onChange={(event) => setMaterialTitle(event.target.value)}
                placeholder="Ej. Apuntes de la unidad 1"
                value={materialTitle}
              />
            </label>
            <label className="block text-sm font-semibold" htmlFor="material-content">
              Texto o apuntes
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                id="material-content"
                onChange={(event) => setMaterialContent(event.target.value)}
                placeholder="Pega aquí el contenido que quieres estudiar…"
                value={materialContent}
              />
            </label>
            <label
              className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-dashed border-violet-300 bg-[#f8f7fc] px-4 text-sm font-semibold text-[#6d4aff]"
              htmlFor="material-file"
            >
              <span>{selectedFileName || "O selecciona un archivo"}</span>
              <span aria-hidden="true">↑</span>
              <input
                accept=".pdf,.txt,.doc,.docx"
                className="sr-only"
                id="material-file"
                onChange={selectFile}
                type="file"
              />
            </label>
            <p className="text-xs leading-5 text-slate-500">
              La carga se mantiene localmente en esta primera interfaz; el almacenamiento se
              implementará próximamente.
            </p>
            <DialogActions
              onCancel={() => setIsMaterialDialogOpen(false)}
              submitLabel="Agregar material"
            />
          </form>
        </Dialog>
      )}

      {(isUserLoading || isUserModalOpen) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#f8f7fc] p-6">
          {isUserLoading ? (
            <div className="text-center">
              <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#6d4aff]" />
              <p className="mt-4 text-sm text-slate-500">Cargando tu espacio…</p>
            </div>
          ) : (
            <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight">¡Hola! 👋</h2>
              <p className="mt-2 text-sm text-slate-500">
                Cuéntanos tu nombre para personalizar tu experiencia de estudio.
              </p>
              <form className="mt-5 space-y-4" onSubmit={saveUser}>
                <label className="block text-sm font-semibold" htmlFor="user-name">
                  ¿Cómo te llamas?
                  <input
                    autoFocus
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
                    id="user-name"
                    onChange={(event) => setUserName(event.target.value)}
                    placeholder="Ej. Alex"
                    required
                    value={userName}
                  />
                </label>
                {userError && (
                  <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                    {userError}
                  </p>
                )}
                <button
                  className="min-h-12 w-full rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingUser}
                  type="submit"
                >
                  {isSavingUser ? "Guardando…" : "Comenzar"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function HomeView({
  notice,
  subjects,
  isLoading,
  loadError,
  userName,
  openSubjects,
  openSubjectDialog,
  openMaterialDialog
}: {
  notice: string;
  subjects: Subject[];
  isLoading: boolean;
  loadError: string;
  userName: string;
  openSubjects: () => void;
  openSubjectDialog: () => void;
  openMaterialDialog: () => void;
}) {
  return (
    <>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight sm:text-3xl">
            ¡Hola, {userName}! <span aria-hidden="true">👋</span>
          </p>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Listo para aprender con tus propios materiales.
          </p>
        </div>
        <div className="flex w-full divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white px-2 py-2 shadow-sm sm:w-auto">
          <Stat emoji="🔥" label="Racha" value="5 días" />
          <Stat emoji="⭐" label="XP" value="1,240" />
          <Stat emoji="💎" label="Diamantes" value="230" />
          <button
            aria-label="Notificaciones"
            className="grid size-12 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-50"
            type="button"
          >
            ♧
          </button>
        </div>
      </header>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8b6bff] to-[#5b3fe0] p-6 text-white shadow-sm sm:p-8">
            <div className="relative z-10 max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                ◎ Reto de hoy
              </span>
              <h1 className="mt-5 text-2xl font-bold sm:text-3xl">Aprende a tu ritmo</h1>
              <p className="mt-2 text-white/85">
                Selecciona una materia y agrega el material que quieres estudiar.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
                <span>Materiales propios</span>
                <span>•</span>
                <span>Preguntas personalizadas</span>
                <span>•</span>
                <span>Progreso real</span>
              </div>

            </div>
            <span
              aria-hidden="true"
              className="absolute bottom-[-28px] right-5 text-[150px] opacity-20 sm:text-[180px]"
            >
              🤖
            </span>
            <span
              aria-hidden="true"
              className="absolute right-8 top-7 text-3xl text-amber-300"
            >
              ✦
            </span>
          </section>

          <section aria-labelledby="home-subjects-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold" id="home-subjects-heading">
                  Mis materias
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Organiza el contenido que estudias.
                </p>
              </div>
              <button
                className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#6d4aff] hover:bg-[#f1eeff]"
                onClick={openSubjectDialog}
                type="button"
              >
                + Nueva materia
              </button>
            </div>

            {notice && (
              <p
                aria-live="polite"
                className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
              >
                {notice}
              </p>
            )}

            {isLoading ? (
              <div className="mt-4 grid min-h-32 place-items-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Cargando tus materias…</p>
              </div>
            ) : loadError ? (
              <div className="mt-4 grid min-h-40 place-items-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-8 text-center">
                <div>
                  <span aria-hidden="true" className="text-3xl">⚠</span>
                  <h3 className="mt-3 font-bold text-rose-700">No se pudieron cargar tus materias</h3>
                  <p className="mt-1 text-sm text-rose-600">{loadError}</p>
                </div>
              </div>
            ) : subjects.length === 0 ? (
              <div className="mt-4 grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                <div>
                  <span aria-hidden="true" className="text-3xl">▤</span>
                  <h3 className="mt-3 font-bold">Sin materias</h3>
                  <p className="mt-1 text-sm text-slate-500">Crea tu primera materia para empezar a estudiar.</p>
                  <button
                    className="mt-5 min-h-11 rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
                    onClick={openSubjectDialog}
                    type="button"
                  >
                    + Nueva materia
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {subjects.map((subject) => (
                  <article
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                    key={subject.id}
                  >
                    <div className={`grid size-12 place-items-center rounded-2xl text-xl ${subject.iconBackground}`}>
                      {subject.icon}
                    </div>
                    <h3 className="mt-4 text-sm font-bold">{subject.name}</h3>
                    {subject.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{subject.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{subject.materials} materiales</span>
                      <span>{subject.progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${subject.progressColor}`}
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{subject.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="rounded-2xl border border-slate-100 bg-[#fef3e2] p-6 shadow-sm xl:self-start">
          <span aria-hidden="true" className="text-4xl">🎒</span>
          <h2 className="mt-5 text-lg font-bold">¡No olvides!</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Agrega el material que te mandan en la escuela para generar quizzes personalizados.
          </p>
          <button
            className="mt-5 min-h-12 w-full rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
            onClick={openMaterialDialog}
            type="button"
          >
            Agregar material ⊕
          </button>
        </aside>
      </div>
    </>
  );
}

function SubjectsView({
  notice,
  subjects,
  isLoading,
  loadError,
  filter,
  onFilterChange,
  openSubjectDialog,
  openEditDialog,
  openDeleteDialog
}: {
  notice: string;
  subjects: Subject[];
  isLoading: boolean;
  loadError: string;
  filter: string;
  onFilterChange: (value: string) => void;
  openSubjectDialog: () => void;
  openEditDialog: (subject: Subject) => void;
  openDeleteDialog: (subject: Subject) => void;
}) {
  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis materias</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra el contenido que estudias.
          </p>
        </div>
        <button
          className="min-h-12 rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#5b3fe0]"
          onClick={openSubjectDialog}
          type="button"
        >
          + Nueva materia
        </button>
      </header>

      <div className="mt-6">
        <input
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none placeholder:text-slate-400 focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]"
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Buscar por nombre o descripción…"
          type="text"
          value={filter}
        />
      </div>

      {notice && (
        <p
          aria-live="polite"
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {notice}
        </p>
      )}

      {isLoading ? (
        <div className="mt-6 grid min-h-40 place-items-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Cargando tus materias…</p>
        </div>
      ) : loadError ? (
        <div className="mt-6 grid min-h-40 place-items-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-8 text-center">
          <div>
            <span aria-hidden="true" className="text-3xl">⚠</span>
            <h3 className="mt-3 font-bold text-rose-700">No se pudieron cargar tus materias</h3>
            <p className="mt-1 text-sm text-rose-600">{loadError}</p>
          </div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="mt-6 grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <div>
            <span aria-hidden="true" className="text-3xl">🔍</span>
            {filter ? (
              <>
                <h3 className="mt-3 font-bold">Sin resultados</h3>
                <p className="mt-1 text-sm text-slate-500">
                  No se encontraron materias para &quot;{filter}&quot;.
                </p>
              </>
            ) : (
              <>
                <h3 className="mt-3 font-bold">Sin materias</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crea tu primera materia para empezar a estudiar.
                </p>
                <button
                  className="mt-5 min-h-11 rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white hover:bg-[#5b3fe0]"
                  onClick={openSubjectDialog}
                  type="button"
                >
                  + Nueva materia
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {subjects.map((subject) => (
            <article
              className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
              key={subject.id}
            >
              <div className="flex items-start justify-between">
                <div className={`grid size-11 place-items-center rounded-xl text-lg ${subject.iconBackground}`}>
                  {subject.icon}
                </div>
                <div className="flex gap-1">
                  <button
                    className="grid size-8 place-items-center rounded-lg text-sm text-slate-400 hover:bg-slate-100 hover:text-[#6d4aff]"
                    onClick={() => openEditDialog(subject)}
                    title="Editar"
                    type="button"
                  >
                    ✎
                  </button>
                  <button
                    className="grid size-8 place-items-center rounded-lg text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => openDeleteDialog(subject)}
                    title="Eliminar"
                    type="button"
                  >
                    🗑
                  </button>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-bold">{subject.name}</h3>
              {subject.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2" title={subject.description}>
                  {subject.description}
                </p>
              )}
              <div className="mt-auto pt-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{subject.materials} materiales</span>
                  <span>{subject.progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${subject.progressColor}`}
                    style={{ width: `${subject.progress}%` }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({
  emoji,
  label,
  value
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-[82px] items-center gap-2 px-3 sm:min-w-[102px]">
      <span aria-hidden="true" className="text-xl">
        {emoji}
      </span>
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function Dialog({
  children,
  onClose,
  title
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-30 grid place-items-center bg-slate-950/35 p-4"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            aria-label="Cerrar"
            className="grid size-11 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogActions({
  disabled = false,
  onCancel,
  submitLabel
}: {
  disabled?: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3">
      <button
        className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        onClick={onCancel}
        type="button"
      >
        Cancelar
      </button>
      <button
        className="min-h-11 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="submit"
      >
        {submitLabel}
      </button>
    </div>
  );
}
