import { Plus, LayoutGrid, Inbox, CalendarDays, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

export const BottomNav = ({ onQuickAdd }) => {
  const location = useLocation();

  const checkLinkActive = (to) => {
    if (to.includes("?")) {
      const [path, query] = to.split("?");
      return location.pathname === path && location.search.includes(query);
    }
    return location.pathname === to;
  };

  const tabs = [
    { to: "/", label: "Home", icon: LayoutGrid, end: true },
    { to: "/tasks?view=inbox", label: "Inbox", icon: Inbox },
    { to: "/tasks?view=my_day", label: "Today", icon: CalendarDays },
    { to: "/profile", label: "Settings", icon: Settings },
  ];

  const getTabLinkClass = (to) => {
    const isActive = checkLinkActive(to);
    return `flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1.5 text-[10px] font-semibold transition-all duration-200 ${
      isActive ? "text-brand-600 dark:text-brand-400" : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600"
    }`;
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/95 min-[1025px]:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        {/* Left Tabs */}
        {tabs.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={getTabLinkClass(to)}>
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* Center Floating Action Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onQuickAdd}
            className="-mt-7 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-500/30 transition-all duration-200 active:scale-[0.93] active:bg-brand-700 dark:bg-brand-500 focus-ring"
            aria-label="Quick Add Task"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right Tabs */}
        {tabs.slice(2).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={getTabLinkClass(to)}>
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
export default BottomNav;
