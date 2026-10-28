import { ICON_GLYPHS, type IconName } from "../../lib/icons";

export type { IconName } from "../../lib/icons";

export function Icon({
  name,
  className = ""
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`fi fi-rr-${ICON_GLYPHS[name]} inline-flex shrink-0 items-center justify-center leading-none ${className}`}
    />
  );
}
