import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  useEffect,
  useRef
} from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((element) => {
    if (element.hasAttribute("disabled")) return false;
    if (element.getAttribute("aria-hidden") === "true") return false;
    if (element.hasAttribute("hidden")) return false;
    return true;
  });
}

export interface UseModalBehaviorOptions {
  /** Se invoca para cerrar el modal (Escape, fondo, etc.). */
  onClose: () => void;
  /** Cerrar con la tecla Escape. Por defecto `true`. */
  closeOnEscape?: boolean;
  /** Cerrar al pulsar el fondo (overlay). Por defecto `true`. */
  closeOnBackdrop?: boolean;
  /** Elemento a enfocar al abrir; si no se indica, el primer accionable. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Devolver el foco al elemento que abrió el modal al cerrar. Por defecto `true`. */
  restoreFocus?: boolean;
}

export interface UseModalBehaviorResult {
  /** Referencia al contenedor `role="dialog"`. Llévala al elemento con `tabIndex={-1}`. */
  modalRef: RefObject<HTMLDivElement | null>;
  /** Manejador `onKeyDown` del contenedor del diálogo (trampa de foco + Escape). */
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  /** Manejador `onClick` del fondo (overlay) para cerrar al pulsar fuera. */
  onBackdropClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

/**
 * Comportamiento accesible y consistente para diálogos modales:
 * trampa de foco, foco inicial, cierre con Escape, bloqueo de scroll del
 * `body` y restauración del foco al elemento que abrió el modal.
 *
 * El contenedor referenciado debe llevar `role="dialog"`, `aria-modal="true"`,
 * `tabIndex={-1}` (para poder recibir el foco cuando no hay accionables) y el
 * manejador `onKeyDown`. El fondo (overlay) debe llevar `onBackdropClick`.
 */
export function useModalBehavior({
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
  initialFocusRef,
  restoreFocus = true
}: UseModalBehaviorOptions): UseModalBehaviorResult {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = modalRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusTarget =
      initialFocusRef?.current ?? getFocusableElements(container)[0] ?? container;
    focusTarget.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (restoreFocus && previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [initialFocusRef, restoreFocus]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (closeOnEscape) {
        event.preventDefault();
        onClose();
      }
      return;
    }

    if (event.key !== "Tab") return;

    const container = modalRef.current;
    if (!container) return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const index = focusable.indexOf(active as HTMLElement);

    event.preventDefault();
    if (event.shiftKey) {
      if (index <= 0) last.focus();
      else focusable[index - 1].focus();
    } else if (index === focusable.length - 1 || index === -1) {
      first.focus();
    } else {
      focusable[index + 1].focus();
    }
  };

  const onBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdrop) return;
    if (event.target === event.currentTarget) {
      event.preventDefault();
      onClose();
    }
  };

  return { modalRef, onKeyDown, onBackdropClick };
}
