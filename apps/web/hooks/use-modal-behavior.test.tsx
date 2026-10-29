// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  useModalBehavior,
  type UseModalBehaviorOptions
} from "./use-modal-behavior";

function ModalContent({
  onClose,
  options
}: {
  onClose: () => void;
  options?: Partial<UseModalBehaviorOptions>;
}) {
  const { modalRef, onKeyDown, onBackdropClick } = useModalBehavior({
    onClose,
    ...options
  });

  return (
    <div
      data-testid="backdrop"
      onClick={onBackdropClick}
      style={{ position: "fixed", inset: 0 }}
    >
      <div
        ref={modalRef}
        aria-modal="true"
        data-testid="modal"
        role="dialog"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <button>Cerrar</button>
        <button>Primero</button>
        <button>Segundo</button>
        <button>Tercero</button>
      </div>
    </div>
  );
}

function Opener({ options }: { options?: Partial<UseModalBehaviorOptions> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button data-testid="opener" onClick={() => setOpen(true)}>
        Abrir
      </button>
      {open && <ModalContent onClose={() => setOpen(false)} options={options} />}
    </>
  );
}

function getModalButtons(): HTMLButtonElement[] {
  return Array.from(
    screen.getByTestId("modal").querySelectorAll("button")
  ) as HTMLButtonElement[];
}

afterEach(cleanup);

describe("useModalBehavior", () => {
  it("enfoca el primer elemento accionable al abrir", () => {
    render(<Opener />);
    const opener = screen.getByTestId("opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);

    const buttons = getModalButtons();
    // El primer accionable del diálogo es el botón "Cerrar" (índice 0).
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("cierra con Escape", () => {
    render(<Opener />);
    const opener = screen.getByTestId("opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);

    fireEvent.keyDown(screen.getByTestId("modal"), { key: "Escape" });

    expect(screen.queryByTestId("modal")).toBeNull();
  });

  it("no cierra con Escape cuando closeOnEscape es false", () => {
    render(<Opener options={{ closeOnEscape: false }} />);
    const opener = screen.getByTestId("opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);

    fireEvent.keyDown(screen.getByTestId("modal"), { key: "Escape" });

    expect(screen.queryByTestId("modal")).not.toBeNull();
  });

  it("cierra al pulsar el fondo (overlay)", () => {
    render(<Opener />);
    const opener = screen.getByTestId("opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(screen.getByTestId("backdrop"));

    expect(screen.queryByTestId("modal")).toBeNull();
  });

  it("no cierra al pulsar dentro del diálogo", () => {
    render(<Opener />);
    const opener = screen.getByTestId("opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(screen.getByTestId("modal"));

    expect(screen.queryByTestId("modal")).not.toBeNull();
  });

  it("no cierra al pulsar el fondo cuando closeOnBackdrop es false", () => {
    render(<Opener options={{ closeOnBackdrop: false }} />);
    const opener = screen.getByTestId("opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(screen.getByTestId("backdrop"));

    expect(screen.queryByTestId("modal")).not.toBeNull();
  });

  it("atrapa el foco: Tab cicla del último al primero y Shift+Tab del primero al último", () => {
    render(<Opener />);
    const opener = screen.getByTestId("opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);

    const buttons = getModalButtons();
    const modal = screen.getByTestId("modal");

    // Cerrar -> Primero -> Segundo -> Tercero -> (wrap) Cerrar
    fireEvent.keyDown(modal, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[1]); // Primero
    fireEvent.keyDown(modal, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[2]); // Segundo
    fireEvent.keyDown(modal, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[3]); // Tercero
    fireEvent.keyDown(modal, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]); // Cerrar (wrap)

    // Cerrar -> (wrap atrás) Tercero
    fireEvent.keyDown(modal, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(buttons[3]); // Tercero
  });

  it("devuelve el foco al elemento que abrió el modal al cerrar", () => {
    render(<Opener />);
    const opener = screen.getByTestId("opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);

    expect(document.activeElement).not.toBe(opener);

    fireEvent.keyDown(screen.getByTestId("modal"), { key: "Escape" });

    expect(screen.queryByTestId("modal")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
