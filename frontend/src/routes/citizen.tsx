import React, { useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import CitizenSidebar from "../components/common/Sidebar";
import CitizenTopBar from "../components/common/TopBar";

export const Route = createFileRoute("/citizen")({
  component: CitizenLayout,
});

function CitizenLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <CitizenTopBar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

      <CitizenSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile overlay — closes sidebar on outside click */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <main className="pt-16 transition-all duration-200 lg:pl-60">
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}