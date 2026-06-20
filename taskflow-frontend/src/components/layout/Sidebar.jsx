import { CheckSquare } from "lucide-react";
import { NavLink } from "react-router-dom";
import { primaryNavItems } from "./navigation";

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
  }`;

const SidebarContent = () => (
  <>
    <div className="mb-8 px-1">
      <NavLink to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
          <CheckSquare size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">TaskFlow</span>
      </NavLink>
    </div>

    <nav className="space-y-0.5" aria-label="Primary navigation">
      {primaryNavItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={navLinkClass}>
          <Icon size={16} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  </>
);

export const Sidebar = () => (
  <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white px-4 py-6 dark:border-neutral-800 dark:bg-neutral-950 min-[1025px]:block">
    <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col">
      <SidebarContent />
    </div>
  </aside>
);
