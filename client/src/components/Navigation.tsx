import { useMemo } from "react";
import { NavLink } from "react-router-dom";

import { cn } from "../lib/utils";

interface NavigationProps {
  orientation?: "vertical" | "horizontal";
  isAdmin?: boolean;
}

function Navigation({ orientation = "vertical", isAdmin }: NavigationProps) {
  const items = useMemo(
    () =>
      [
        { label: "Overview", to: "/" },
        { label: "Strategies", to: "/strategies" },
        { label: "Trades", to: "/trades" },
        { label: "Uploads / Data", to: "/uploads" },
        ...(isAdmin ? [{ label: "Admin Data", to: "/admin" }] : []),
        { label: "Settings / Health", to: "/settings" },
      ],
    [isAdmin],
  );

  return (
    <nav className={cn("text-sm text-slate-700", orientation === "vertical" ? "space-y-1" : "flex gap-2")}>
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-between rounded-md border px-3 py-2 transition",
              "hover:border-slate-300 hover:bg-slate-50",
              orientation === "horizontal" ? "text-xs" : "",
              isActive
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-transparent bg-transparent text-slate-700",
            )
          }
        >
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default Navigation;
