import { useState } from "react";

import { practiceLabel, practiceStatus, type PracticeTone } from "../../lib/practice";
import { Icon } from "./icon";

const TONE_STYLES: Record<PracticeTone, string> = {
  fresh: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  steady: "bg-[#f1eeff] text-[#6d4aff] ring-[#d9d0ff]",
  lapsed: "bg-rose-50 text-rose-700 ring-rose-200",
  none: "bg-slate-100 text-slate-600 ring-slate-200"
};

export function PracticeBadge({ completedAt }: { completedAt: string | null }) {
  const [now] = useState(() => new Date());
  const status = practiceStatus(completedAt, now);

  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${TONE_STYLES[status.tone]}`}
      data-practice-tone={status.tone}
    >
      <Icon name="streak" />
      {practiceLabel(status)}
    </p>
  );
}
