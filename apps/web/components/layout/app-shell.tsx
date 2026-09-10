"use client";

import { type ReactNode } from "react";

import { type NavItemId } from "../../lib/navigation";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export function AppShell({
  activeView,
  onNavigate,
  openMaterialDialog,
  userName,
  children
}: {
  activeView: NavItemId;
  onNavigate: (view: NavItemId) => void;
  openMaterialDialog: () => void;
  userName: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f8f7fc] pb-24 text-[#1e1b2e] lg:pb-0">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <Sidebar
          activeView={activeView}
          onNavigate={onNavigate}
          openMaterialDialog={openMaterialDialog}
          userName={userName}
        />
        <section className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-8 lg:py-9">
          {children}
        </section>
      </div>
      <MobileNav
        activeView={activeView}
        onNavigate={onNavigate}
        openMaterialDialog={openMaterialDialog}
      />
    </main>
  );
}