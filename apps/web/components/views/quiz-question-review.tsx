import { assetUrl } from "../../lib/api";
import { Icon } from "../ui/icon";

/**
 * Repaso de una pregunta ya respondida (resultado recién obtenido o detalle de
 * un intento antiguo). Compartido por la pantalla de resultado y el popup de
 * detalle para que la corrección se vea igual en los dos sitios.
 */
export function QuizQuestionReview({
  index,
  statement,
  imageUrl,
  options,
  selectedOptionId,
  correctOptionId,
  isCorrect,
  explanation
}: {
  index: number;
  statement: string;
  imageUrl: string | null;
  options: { id: string; text: string }[];
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean;
  explanation: string | null;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold">
          {index}. {statement}
        </h3>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          }`}
        >
          {isCorrect ? "Correcta" : "Incorrecta"}
        </span>
      </div>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- Imagen servida por la API propia (MinIO/S3), sin optimizador
        <img
          alt="Imagen de los apuntes usada en la pregunta"
          className="mt-3 max-h-72 w-full rounded-xl border border-slate-100 bg-white object-contain"
          src={assetUrl(imageUrl)}
        />
      )}
      <div className="mt-3 space-y-2">
        {options.map((option) => {
          const optionIsCorrect = option.id === correctOptionId;
          const isSelected = option.id === selectedOptionId;
          const badge = optionIsCorrect
            ? " bg-emerald-50 text-emerald-700"
            : isSelected
            ? " bg-rose-50 text-rose-600"
            : " text-slate-500";
          return (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${badge} ${
                optionIsCorrect || isSelected ? "border-slate-200" : "border-transparent"
              }`}
              key={option.id}
            >
              {option.text}
              {optionIsCorrect && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Icon name="check" /> Respuesta correcta
                </span>
              )}
              {isSelected && !optionIsCorrect && <span className="ml-2">Tu respuesta</span>}
            </div>
          );
        })}
      </div>
      {explanation && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <span className="font-semibold">Explicación: </span>
          {explanation}
        </p>
      )}
    </article>
  );
}
