import React, { useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import CitizenSidebar from "../components/common/Sidebar";
import CitizenTopBar from "../components/common/TopBar";
import { RequireRole } from "../auth/guards";

export const Route = createFileRoute("/citizen")({
  component: () => (
    <RequireRole roles={["citizen", "system_admin"]}>
      <CitizenLayout />
    </RequireRole>
  ),
});

/**
 * Citizen Portal shell.
 *
 *   viewport
 *     ├── header   (fixed, 72px)
 *     └── main     (fills ALL remaining width/height)
 *          └── page content
 *
 * The sidebar is `position: fixed`, so on desktop the main area reserves its
 * 260px gutter with padding rather than a flex column. That keeps the
 * content column free to grow all the way to the right edge of the viewport
 * at 1280px, 1440px, 1600px and 1920px instead of being boxed in.
 *
 * `min-h-screen` lives on the outer wrapper only, and `main` is `flex-1`.
 * Pages therefore must NOT declare their own `min-h-screen` — doing so adds a
 * full extra viewport of dead space below the fold.
 */
function CitizenLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-[#F4F8FB]">
      {/* 1. Fixed top header — height 72px (see TopBar) */}
      <CitizenTopBar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

      {/* 2. Fixed left sidebar — 260px wide on desktop, drawer on mobile */}
      <CitizenSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 3. Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[1150] bg-black/60 transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* 4. Page content — fills the width left over by the sidebar */}
      <main
        id="main-content"
        className="citizen-main-content flex w-full min-w-0 flex-1 flex-col bg-[#F4F8FB] pt-[72px] lg:pl-[260px]"
      >
        <Outlet />
      </main>
    </div>
  );
}

export default CitizenLayout;
