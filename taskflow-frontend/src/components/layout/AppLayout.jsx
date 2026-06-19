import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export const AppLayout = () => {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell md:flex">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="min-w-0 flex-1">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
