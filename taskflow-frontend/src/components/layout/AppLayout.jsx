import { Outlet } from "react-router-dom";
import { useState } from "react";
import { NotificationSync } from "../notifications/NotificationSync";
import { TaskModal } from "../tasks/TaskModal";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export const AppLayout = () => {
  const [navOpen, setNavOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  return (
    <div className="app-shell min-h-screen lg:flex">
      <NotificationSync />
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="min-w-0 flex-1">
        <Topbar onOpenNav={() => setNavOpen(true)} onQuickAdd={() => setTaskModalOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <BottomNav onQuickAdd={() => setTaskModalOpen(true)} />
      <TaskModal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} />
    </div>
  );
};
