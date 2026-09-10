export function Notice({ children }: { children: string }) {
  return (
    <p
      aria-live="polite"
      className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
    >
      {children}
    </p>
  );
}

export function FieldError({ children }: { children: string }) {
  return (
    <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
      {children}
    </p>
  );
}