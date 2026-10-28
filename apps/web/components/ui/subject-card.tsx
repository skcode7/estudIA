import { type Subject } from "../../lib/subjects";
import { Icon } from "./icon";

export function SubjectCard({
  subject,
  onEdit,
  onDelete
}: {
  subject: Subject;
  onEdit?: (subject: Subject) => void;
  onDelete?: (subject: Subject) => void;
}) {
  const isSubjectsView = Boolean(onEdit && onDelete);

  return (
    <article
      className={
        isSubjectsView
          ? "flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
          : "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
      }
    >
      <div className="flex items-start justify-between">
        <div
          className={`grid place-items-center rounded-2xl text-xl ${subject.iconBackground} ${
            isSubjectsView ? "size-11 rounded-xl text-lg" : "size-12"
          }`}
        >
          <Icon className="text-2xl" name={subject.icon} />
        </div>
        {isSubjectsView && (
          <div className="flex gap-1">
            <button
              aria-label={`Editar materia ${subject.name}`}
              className="grid size-11 place-items-center rounded-xl text-sm text-slate-400 hover:bg-slate-100 hover:text-[#6d4aff]"
              onClick={() => onEdit?.(subject)}
              type="button"
            >
              <Icon className="text-lg" name="edit" />
            </button>
            <button
              aria-label={`Eliminar materia ${subject.name}`}
              className="grid size-11 place-items-center rounded-xl text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => onDelete?.(subject)}
              type="button"
            >
              <Icon className="text-lg" name="delete" />
            </button>
          </div>
        )}
      </div>
      <h3 className="mt-3 text-sm font-bold">{subject.name}</h3>
      {subject.description && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-2" title={subject.description}>
          {subject.description}
        </p>
      )}
      <div className={isSubjectsView ? "mt-auto pt-3" : "mt-3"}>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{subject.materials} materiales</span>
          <span>{subject.progress}%</span>
        </div>
        <div
          className={
            isSubjectsView
              ? "mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"
              : "mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
          }
        >
          <div
            className={`h-full rounded-full ${subject.progressColor}`}
            style={{ width: `${subject.progress}%` }}
          />
        </div>
        {!isSubjectsView && <p className="mt-3 text-xs text-slate-500">{subject.message}</p>}
      </div>
    </article>
  );
}
