import { CalendarDays, CheckSquare, LayoutGrid, UserRound } from "lucide-react";

export const primaryNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: UserRound },
];

