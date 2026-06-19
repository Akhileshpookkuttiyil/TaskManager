import { CalendarDays, CheckSquare, Home, Plus, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: UserRound },
];

const navClass = ({ isActive }) =>
  `flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
    isActive ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
  }`;

export const BottomNav = ({ onQuickAdd }) => (
  <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/98 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/98 lg:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
      {items.slice(0, 2).map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"} className={navClass}>
          <Icon size={19} strokeWidth={1.85} />
          {label}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={onQuickAdd}
        className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-neutral-900 text-white shadow-lg transition-colors active:scale-[0.98] dark:border-neutral-700 dark:bg-white dark:text-neutral-900"
        aria-label="Add task"
      >
        <Plus size={22} strokeWidth={2.4} />
      </button>

      {items.slice(2).map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={navClass}>
          <Icon size={19} strokeWidth={1.85} />
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);
