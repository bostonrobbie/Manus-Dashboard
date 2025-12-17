import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { 
  Home, 
  BarChart3, 
  TrendingUp, 
  GitCompare, 
  PieChart, 
  Briefcase, 
  FileText, 
  Upload, 
  Settings, 
  Database 
} from "lucide-react";

import { cn } from "../lib/utils";

interface NavigationProps {
  orientation?: "vertical" | "horizontal";
  isAdmin?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}

const navIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": Home,
  "/overview": BarChart3,
  "/strategies": TrendingUp,
  "/compare": GitCompare,
  "/analytics": PieChart,
  "/portfolios": Briefcase,
  "/trades": FileText,
  "/uploads": Upload,
  "/settings": Settings,
  "/admin": Database,
};

function Navigation({ orientation = "vertical", isAdmin, collapsed, onNavigate }: NavigationProps) {
  const items = useMemo(
    () =>
      [
        { label: "Home Dashboard", to: "/" },
        { label: "Overview", to: "/overview" },
        { label: "Strategies", to: "/strategies" },
        { label: "Compare", to: "/compare" },
        { label: "Visual Analytics", to: "/analytics" },
        { label: "Custom Portfolios", to: "/portfolios" },
        { label: "Trade Log", to: "/trades" },
        { label: "Uploads", to: "/uploads" },
        { label: "Settings / Health", to: "/settings" },
        ...(isAdmin ? [{ label: "Admin Data", to: "/admin" }] : []),
      ],
    [isAdmin],
  );

  return (
    <nav 
      className={cn(
        "text-sm text-gray-300", 
        orientation === "vertical" ? "space-y-1" : "flex gap-2 flex-wrap"
      )}
      aria-label="Main navigation"
    >
      {items.map(item => {
        const Icon = navIcons[item.to] || Home;
        
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200",
                "hover:border-[#3a3a3a] hover:bg-[#2a2a2a] hover:text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]",
                "touch-target tap-highlight-none",
                orientation === "horizontal" ? "text-xs py-2" : "",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "border-blue-600 bg-blue-600/20 text-blue-400 shadow-sm"
                  : "border-transparent bg-transparent text-gray-400",
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <Icon className={cn(
              "flex-shrink-0 transition-colors",
              collapsed ? "w-5 h-5" : "w-4 h-4",
              "group-hover:text-blue-400"
            )} />
            {!collapsed && (
              <span className="truncate">{item.label}</span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default Navigation;
