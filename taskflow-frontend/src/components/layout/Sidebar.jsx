import { useState, useEffect, useMemo } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CheckSquare, Tag, ChevronDown, ChevronRight } from "lucide-react";
import { primaryNavItems } from "./navigation";
import { fetchStats } from "../../store/slices/tasksSlice";

export const Sidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { stats } = useSelector((state) => state.tasks);
  const { unreadCount: notificationsCount } = useSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  const [labelsExpanded, setLabelsExpanded] = useState(true);

  // Extract unique labels/tags from global stats (across entire database)
  const labels = useMemo(() => (stats?.tags || []).slice(0, 8), [stats?.tags]);

  // Central calculations based on complete database statistics
  const inboxCount = useMemo(() => (stats?.pending ?? 0) + (stats?.in_progress ?? 0), [stats?.pending, stats?.in_progress]);
  const todayCount = useMemo(() => stats?.dueToday ?? 0, [stats?.dueToday]);

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
    return `group flex items-center justify-between rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 relative ${
      isActive
        ? "bg-hover text-primary font-semibold"
        : "text-secondary hover:bg-hover hover:text-primary"
    }`;
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-neutral bg-app px-4 py-6 min-[1025px]:block">
      <div className="flex h-full flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Brand Header */}
          <Link to="/" className="flex items-center gap-2.5 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)]">
              <CheckSquare size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-primary">TaskFlow</span>
              <span className="ml-1.5 rounded bg-elevated border border-subtle px-1.5 py-0.5 text-[10px] font-semibold text-muted">v1.0</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {primaryNavItems.map(({ to, label, icon: Icon, end }) => {
              const count = getBadgeCount(label);
              return (
                <NavLink key={to} to={to} end={end} className={() => getNavLinkClass(to)}>
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className="text-muted group-hover:text-primary transition-colors" />
                    <span>{label}</span>
                  </div>
                  {count > 0 && (
                    <span className="rounded-full bg-elevated border border-subtle px-2 py-0.5 text-xs font-semibold text-secondary tabular-nums">
                      {count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Labels Section */}
          {labels.length > 0 && (
            <div className="pt-2 border-t border-neutral">
              <button
                type="button"
                onClick={() => setLabelsExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold text-muted hover:text-primary"
              >
                <span className="uppercase tracking-wider">Labels</span>
                {labelsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {labelsExpanded && (
                <div className="mt-1 space-y-0.5">
                  {labels.map((label) => (
                    <Link
                      key={label}
                      to={`/tasks?tag=${encodeURIComponent(label)}`}
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-secondary hover:bg-hover hover:text-primary transition-colors"
                    >
                      <Tag size={12} className="text-muted" />
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / System Status */}
        <div className="border-t border-neutral pt-4 px-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-muted">System Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
