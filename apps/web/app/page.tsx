"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from "react";

import { createSubject, listSubjects, type ApiSubject } from "../lib/api";

type Subject = ApiSubject & { progress: number; materials: number; icon: string; iconBackground: string; progressColor: string; message: string };

const navItems = [["home", "⌂", "Inicio"], ["subjects", "▤", "Mis materias"], ["quiz", "?", "Quiz"], ["review", "↻", "Repaso"], ["progress", "▥", "Progreso"], ["badges", "♜", "Insignias"]] as const;
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
  const [materialSubjectId, setMaterialSubjectId] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [notice, setNotice] = useState("");

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
    return () => { cancelled = true; };
  }, []);

  function openSubjects(): void { setActiveView("subjects"); setNotice(""); }

  function openSubjectDialog(): void { setIsSubjectDialogOpen(true); setNotice(""); setCreateError(""); }

  async function addSubject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = newSubjectName.trim();
    if (!name) return;
    setIsCreating(true);
    setCreateError("");
    try {
      const created = await createSubject({ name });
      const subject = decorateSubject(created, subjects.length);
      setSubjects((current) => [...current, subject]);
      setMaterialSubjectId(subject.id);
      setNewSubjectName("");
      setIsSubjectDialogOpen(false);
      setNotice(`"${name}" se agregó a tus materias.`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "No se pudo crear la materia.");
    } finally {
      setIsCreating(false);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>): void { setSelectedFileName(event.target.files?.[0]?.name ?? ""); }

  function addMaterial(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!materialSubjectId || (!materialTitle.trim() && !selectedFileName && !materialContent.trim())) return;
    const selectedSubject = subjects.find((subject) => subject.id === materialSubjectId);
    setSubjects((currentSubjects) => currentSubjects.map((subject) => subject.id === materialSubjectId ? { ...subject, materials: subject.materials + 1 } : subject));
    setNotice(`Material añadido a ${selectedSubject?.name ?? "la materia"}.`);
    setMaterialTitle(""); setMaterialContent(""); setSelectedFileName(""); setIsMaterialDialogOpen(false);
  }

  const currentNavItem = navItems.find(([id]) => id === activeView)?.[2] ?? "Inicio";
  const showDashboard = activeView === "home" || activeView === "subjects";

  return (
    <main className="min-h-screen bg-[#f8f7fc] pb-24 text-[#1e1b2e] lg:pb-0">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-7 lg:flex">
          <button className="flex items-center gap-2 px-3 text-left" onClick={() => setActiveView("home")} type="button"><span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-[#6d4aff] text-xl text-white">🤖</span><span className="text-2xl font-bold tracking-tight">estud<span className="text-[#6d4aff]">IA</span></span></button>
          <nav aria-label="Navegación principal" className="mt-10 space-y-2">
            {navItems.map(([id, icon, label]) => <button className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${activeView === id ? "bg-[#f1eeff] font-semibold text-[#6d4aff]" : "text-slate-500 hover:bg-slate-50"}`} key={id} onClick={() => setActiveView(id)} type="button"><span aria-hidden="true" className="grid size-5 place-items-center text-lg">{icon}</span>{label}</button>)}
          </nav>
          <div className="mt-7 border-t border-slate-100 pt-5"><button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-[#f1eeff] hover:text-[#6d4aff]" onClick={() => setIsMaterialDialogOpen(true)} type="button"><span aria-hidden="true" className="text-xl">⊕</span>Agregar material</button></div>
          <div className="mt-auto rounded-2xl border border-slate-100 p-4 shadow-sm"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-violet-100 text-xl">🧑‍🎓</span><div><p className="text-sm font-bold">Alex</p><p className="text-xs text-[#6d4aff]">Nivel 8</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-[77%] rounded-full bg-[#6d4aff]" /></div><p className="mt-2 text-xs text-slate-500">1,240 / 1,600 XP</p></div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-8 lg:py-9">
          {showDashboard ? <>
            <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div><p className="text-2xl font-bold tracking-tight sm:text-3xl">¡Hola, Alex! <span aria-hidden="true">👋</span></p><p className="mt-1 text-sm text-slate-500 sm:text-base">Listo para aprender con tus propios materiales.</p></div><div className="flex w-full divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white px-2 py-2 shadow-sm sm:w-auto"><Stat emoji="🔥" label="Racha" value="5 días" /><Stat emoji="⭐" label="XP" value="1,240" /><Stat emoji="💎" label="Diamantes" value="230" /><button aria-label="Notificaciones" className="grid size-12 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-50" type="button">♧</button></div></header>
            <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-6">
              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8b6bff] to-[#5b3fe0] p-6 text-white shadow-sm sm:p-8"><div className="relative z-10 max-w-md"><span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">◎ Reto de hoy</span><h1 className="mt-5 text-2xl font-bold sm:text-3xl">Aprende a tu ritmo</h1><p className="mt-2 text-white/85">Selecciona una materia y agrega el material que quieres estudiar.</p><div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium"><span>Materiales propios</span><span>•</span><span>Preguntas personalizadas</span><span>•</span><span>Progreso real</span></div><button className="mt-7 min-h-12 rounded-xl bg-white px-5 font-semibold text-[#6d4aff] shadow-sm hover:bg-violet-50" onClick={openSubjects} type="button">Ver mis materias <span aria-hidden="true">→</span></button></div><span aria-hidden="true" className="absolute bottom-[-28px] right-5 text-[150px] opacity-20 sm:text-[180px]">🤖</span><span aria-hidden="true" className="absolute right-8 top-7 text-3xl text-amber-300">✦</span></section>
              <section aria-labelledby="subjects-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold" id="subjects-heading">Mis materias</h2><p className="mt-1 text-sm text-slate-500">Organiza el contenido que estudias.</p></div><button className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#6d4aff] hover:bg-[#f1eeff]" onClick={openSubjectDialog} type="button">+ Nueva materia</button></div>{notice && <p aria-live="polite" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p>}{isLoading ? <div className="mt-4 grid min-h-32 place-items-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Cargando tus materias…</p></div> : loadError ? <div className="mt-4 grid min-h-40 place-items-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-8 text-center"><div><span aria-hidden="true" className="text-3xl">⚠</span><h3 className="mt-3 font-bold text-rose-700">No se pudieron cargar tus materias</h3><p className="mt-1 text-sm text-rose-600">{loadError}</p></div></div> : subjects.length === 0 ? <div className="mt-4 grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm"><div><span aria-hidden="true" className="text-3xl">▤</span><h3 className="mt-3 font-bold">Sin materias</h3><p className="mt-1 text-sm text-slate-500">Crea tu primera materia para empezar a estudiar.</p><button className="mt-5 min-h-11 rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white hover:bg-[#5b3fe0]" onClick={openSubjectDialog} type="button">+ Nueva materia</button></div></div> : <div className="mt-4 grid gap-4 sm:grid-cols-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{subjects.map((subject) => <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" key={subject.id}><div className={`grid size-12 place-items-center rounded-xl text-2xl font-bold ${subject.iconBackground}`}>{subject.icon}</div><h3 className="mt-4 font-bold">{subject.name}</h3><p className="mt-1 text-xs text-slate-500">{subject.materials} {subject.materials === 1 ? "material" : "materiales"}</p><div className="mt-5 flex items-center gap-3"><div aria-label={`${subject.progress}% completado`} className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${subject.progressColor}`} style={{ width: `${subject.progress}%` }} /></div><span className="text-sm font-bold">{subject.progress}%</span></div><p className="mt-4 text-sm text-slate-500">{subject.message}</p></article>)}</div>}</section>
              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Agrega material para estudiar</h2><p className="mt-1 text-sm text-slate-500">Notas, texto o archivos para preparar tu próximo quiz.</p></div><button className="min-h-12 rounded-xl bg-[#6d4aff] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#5b3fe0]" onClick={() => setIsMaterialDialogOpen(true)} type="button">+ Agregar material</button></div></section>
            </div><aside className="rounded-2xl border border-slate-100 bg-[#fef3e2] p-6 shadow-sm xl:self-start"><span aria-hidden="true" className="text-4xl">🎒</span><h2 className="mt-5 text-lg font-bold">¡No olvides!</h2><p className="mt-2 text-sm leading-6 text-slate-600">Agrega el material que te mandan en la escuela para generar quizzes personalizados.</p><button className="mt-5 min-h-12 w-full rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0]" onClick={() => setIsMaterialDialogOpen(true)} type="button">Agregar material ⊕</button></aside></div>
          </> : <section className="grid min-h-[60vh] place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center"><div><span aria-hidden="true" className="text-4xl">✦</span><h1 className="mt-4 text-xl font-bold">{currentNavItem}</h1><p className="mt-2 text-sm text-slate-500">Esta sección estará disponible próximamente.</p></div></section>}
        </section>
      </div>

      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-20 flex h-20 items-center justify-around border-t border-slate-100 bg-white px-2 lg:hidden">{navItems.slice(0, 4).map(([id, icon, label]) => <button className={`grid min-h-12 min-w-12 place-items-center gap-0.5 rounded-xl px-2 text-xs ${activeView === id ? "font-bold text-[#6d4aff]" : "text-slate-500"}`} key={id} onClick={() => setActiveView(id)} type="button"><span className="text-lg">{icon}</span>{label}</button>)}<button aria-label="Agregar material" className="-mt-9 grid size-14 place-items-center rounded-full bg-[#6d4aff] text-2xl text-white shadow-lg shadow-violet-300" onClick={() => setIsMaterialDialogOpen(true)} type="button">🤖</button></nav>

      {isSubjectDialogOpen && <Dialog onClose={() => setIsSubjectDialogOpen(false)} title="Nueva materia"><form className="space-y-5" onSubmit={addSubject}><label className="block text-sm font-semibold" htmlFor="subject-name">Nombre de la materia<input autoFocus className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]" id="subject-name" onChange={(event) => setNewSubjectName(event.target.value)} placeholder="Ej. Inglés" required value={newSubjectName} /></label>{createError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{createError}</p>}<DialogActions disabled={isCreating} onCancel={() => setIsSubjectDialogOpen(false)} submitLabel={isCreating ? "Creando…" : "Crear materia"} /></form></Dialog>}
      {isMaterialDialogOpen && <Dialog onClose={() => setIsMaterialDialogOpen(false)} title="Agregar material"><form className="space-y-4" onSubmit={addMaterial}><label className="block text-sm font-semibold" htmlFor="material-subject">Materia<select className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]" id="material-subject" onChange={(event) => setMaterialSubjectId(event.target.value)} value={materialSubjectId}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className="block text-sm font-semibold" htmlFor="material-title">Título<input className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]" id="material-title" onChange={(event) => setMaterialTitle(event.target.value)} placeholder="Ej. Apuntes de la unidad 1" value={materialTitle} /></label><label className="block text-sm font-semibold" htmlFor="material-content">Texto o apuntes<textarea className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#6d4aff] focus:ring-2 focus:ring-[#f1eeff]" id="material-content" onChange={(event) => setMaterialContent(event.target.value)} placeholder="Pega aquí el contenido que quieres estudiar…" value={materialContent} /></label><label className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-dashed border-violet-300 bg-[#f8f7fc] px-4 text-sm font-semibold text-[#6d4aff]" htmlFor="material-file"><span>{selectedFileName || "O selecciona un archivo"}</span><span aria-hidden="true">↑</span><input accept=".pdf,.txt,.doc,.docx" className="sr-only" id="material-file" onChange={selectFile} type="file" /></label><p className="text-xs leading-5 text-slate-500">La carga se mantiene localmente en esta primera interfaz; el almacenamiento se conectará al backend en el siguiente paso.</p><DialogActions onCancel={() => setIsMaterialDialogOpen(false)} submitLabel="Guardar material" /></form></Dialog>}
    </main>
  );
}

function Stat({ emoji, label, value }: { emoji: string; label: string; value: string }) { return <div className="flex min-w-[82px] items-center gap-2 px-3 sm:min-w-[102px]"><span aria-hidden="true" className="text-xl">{emoji}</span><div><p className="text-[11px] text-slate-500">{label}</p><p className="text-sm font-bold">{value}</p></div></div>; }
function Dialog({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) { return <div aria-modal="true" className="fixed inset-0 z-30 grid place-items-center bg-slate-950/35 p-4" role="dialog"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button aria-label="Cerrar" className="grid size-11 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">×</button></div>{children}</div></div>; }
function DialogActions({ disabled = false, onCancel, submitLabel }: { disabled?: boolean; onCancel: () => void; submitLabel: string }) { return <div className="flex justify-end gap-3"><button className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={onCancel} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5b3fe0] disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} type="submit">{submitLabel}</button></div>; }
