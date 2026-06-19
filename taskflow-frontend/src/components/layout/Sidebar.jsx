import { BarChart2, CheckSquare, LayoutGrid, X } from "lucide-react";
import { NavLink } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/profile", label: "Profile", icon: BarChart2 },
];

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
  }`;

const SidebarContent = ({ onNavigate }) => (
  <>
    <div className="mb-8 px-1">
      <NavLink
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
          <CheckSquare size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">TaskFlow</span>
      </NavLink>
    </div>

    <nav className="space-y-0.5" aria-label="Primary navigation">
      {navLinks.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"} onClick={onNavigate} className={navLinkClass}>
          <Icon size={16} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  </>
);

export const Sidebar = ({ open, onClose }) => (
  <>
    <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white px-4 py-6 dark:border-neutral-800 dark:bg-neutral-950 md:block">
      <div className="sticky top-6">
        <SidebarContent />
      </div>
    </aside>

    {open ? (
      <div className="fixed inset-0 z-40 md:hidden">
        <button
          type="button"
          aria-label="Close navigation"
          className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <aside className="relative h-full w-64 max-w-[80vw] border-r border-neutral-200 bg-white px-4 py-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost mb-6 h-8 w-8 px-0 text-neutral-400"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    ) : null}
  </>
);
