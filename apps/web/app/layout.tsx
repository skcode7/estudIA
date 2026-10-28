import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@flaticon/flaticon-uicons/css/regular/rounded.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "estudIA",
  description: "Aprende con tus propios materiales escolares."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
