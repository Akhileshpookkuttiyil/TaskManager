import {
  BarChart2,
  Bell,
  Calendar,
  CalendarDays,
  Clock,
  Inbox,
  LayoutGrid,
  Settings,
} from "lucide-react";

export const primaryNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/tasks?view=inbox", label: "Inbox", icon: Inbox },
  { to: "/tasks?view=my_day", label: "Today", icon: Calendar },
  { to: "/tasks?view=upcoming", label: "Upcoming", icon: Clock },
  { to: "/tasks?viewMode=calendar", label: "Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: BarChart2 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Settings", icon: Settings },
];
