import { Outlet } from "react-router-dom";
import { useState } from "react";
import { NotificationEngine } from "../notifications/NotificationEngine";
import { TaskModal } from "../tasks/TaskModal";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export const AppLayout = () => {
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  return (
    <div className="app-shell min-h-screen min-[1025px]:flex">
      <NotificationEngine />
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Topbar onQuickAdd={() => setTaskModalOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 max-[1024px]:pb-[calc(6.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 min-[1025px]:pb-8">
          <Outlet />
        </main>
      </div>

      <BottomNav onQuickAdd={() => setTaskModalOpen(true)} />
      <TaskModal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} />
    </div>
  );
};
