"use client";

import { type ReactNode } from "react";

import { type NavItemId } from "../../lib/navigation";
import { MobileMenu } from "./mobile-menu";
import { SiteFooter } from "./site-footer";
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
    <main className="flex min-h-screen flex-col bg-[#f8f7fc] text-[#1e1b2e]">
      <MobileMenu
        activeView={activeView}
        onNavigate={onNavigate}
        openMaterialDialog={openMaterialDialog}
        userName={userName}
      />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
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
      <SiteFooter />
    </main>
  );
}
