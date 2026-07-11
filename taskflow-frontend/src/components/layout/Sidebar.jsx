import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { CheckSquare, Tag, ChevronDown, ChevronRight } from "lucide-react";
import { primaryNavItems } from "./navigation";

export const Sidebar = () => {
  const location = useLocation();
  const { items: tasks } = useSelector((state) => state.tasks);
  const { unreadCount: notificationsCount } = useSelector((state) => state.notifications);

  const [labelsExpanded, setLabelsExpanded] = useState(true);

  // Extract unique labels/tags from active tasks
  const labels = [...new Set(tasks.flatMap((task) => task.tags || []))].slice(0, 8);

  // Central calculations using analytics logic (or simple direct values from selector)
  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  const inboxCount = pendingTasks.length;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayCount = pendingTasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueStr = new Date(t.dueDate).toISOString().split("T")[0];
    return dueStr === todayStr;
  }).length;

  const getBadgeCount = (label) => {
    if (label === "Inbox") return inboxCount;
    if (label === "Today") return todayCount;
    if (label === "Notifications") return notificationsCount;
    return 0;
  };

  const checkLinkActive = (to) => {
    if (to.includes("?")) {
      const [path, query] = to.split("?");
      return location.pathname === path && location.search.includes(query);
    }
    return location.pathname === to;
  };

  const getNavLinkClass = (to) => {
    const isActive = checkLinkActive(to);
    return `group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 relative ${
      isActive
        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
        : "text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-white"
    }`;
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white px-4 py-6 dark:border-neutral-800 dark:bg-[#090909] min-[1025px]:block">
      <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="px-1">
            <Link
              to="/"
              className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-neutral-950 dark:bg-white">
                <CheckSquare size={15} className="text-white dark:text-neutral-950" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">TaskFlow</span>
            </Link>
          </div>

          {/* Primary Navigation */}
          <nav className="space-y-1" aria-label="Primary navigation">
            {primaryNavItems.map(({ to, label, icon: Icon, end }) => {
              const count = getBadgeCount(label);
              return (
                <NavLink key={to} to={to} end={end} className={getNavLinkClass(to)}>
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} strokeWidth={1.75} />
                    <span>{label}</span>
                  </div>
                  {count > 0 && (
                    <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Collapsible Labels section */}
          <div className="space-y-1.5">
            <button
              onClick={() => setLabelsExpanded(!labelsExpanded)}
              className="flex w-full items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <span>Labels</span>
              {labelsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {labelsExpanded && (
              <div className="space-y-0.5 pl-1.5">
                {labels.map((label) => (
                  <Link
                    key={label}
                    to={`/tasks?label=${label}`}
                    className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                  >
                    <Tag size={12} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200" />
                    <span className="truncate">{label}</span>
                  </Link>
                ))}
                {labels.length === 0 && (
                  <p className="px-2.5 py-1 text-xs text-neutral-400 dark:text-neutral-600">No active labels</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
