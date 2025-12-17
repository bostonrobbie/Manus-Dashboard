import { PropsWithChildren, useMemo, useState, useCallback, useEffect } from "react";
import { Menu, X, Home, BarChart3, TrendingUp, GitCompare, PieChart, FileText, Upload, Settings, ChevronLeft, ChevronRight } from "lucide-react";

import type { AuthSource, SharedAuthUser } from "@shared/types/auth";
import { useHealthStatus } from "../hooks/useHealthStatus";
import { useDashboardState } from "../providers/DashboardProvider";
import Navigation from "./Navigation";
import TimeRangeSelector from "./TimeRangeSelector";
import WorkspaceSelector from "./WorkspaceSelector";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface DashboardLayoutProps extends PropsWithChildren {
  user: SharedAuthUser;
  mode: AuthSource;
  mock?: boolean;
}

function DashboardLayout({ children, user, mode, mock }: DashboardLayoutProps) {
  const { status, db, label, mode: healthMode } = useHealthStatus();
  const { timeRange, setTimeRange, workspaceId, setWorkspaceId, workspaces, workspacesLoading, isAdmin } =
    useDashboardState();
  
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Close sidebar on route change or escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);
  
  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false);
  }, []);
  
  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const persona = useMemo(() => {
    const workspaceLabel = workspaceId != null ? `Workspace ${workspaceId}` : "No workspace";
    return `${user.email} · ${workspaceLabel}`;
  }, [user.email, workspaceId]);

  const badgeVariant = (() => {
    if (status === "ok" && (db === "up" || db === "unknown")) return "success" as const;
    if (status === "checking") return "secondary" as const;
    return "warning" as const;
  })();

  const modeLabel = healthMode ?? (mode === "manus" ? "MANUS" : "LOCAL_DEV");
  
  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-60";

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Mobile sidebar overlay */}
      <div 
        className={`sidebar-overlay md:hidden ${sidebarOpen ? "active" : ""}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Mobile navigation drawer */}
      <aside 
        className={`mobile-nav-drawer md:hidden ${sidebarOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Manus</p>
            <h1 className="text-sm font-semibold text-white">Portfolio Control</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors touch-target tap-highlight-none"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="p-4">
          <Navigation isAdmin={isAdmin} onNavigate={() => setSidebarOpen(false)} />
        </div>
        
        <Separator className="bg-[#2a2a2a]" />
        
        <div className="p-4 text-xs text-gray-400">
          <div className="font-semibold text-gray-200">{user.name ?? user.email}</div>
          <div className="mt-1 truncate">{persona}</div>
          {mock && (
            <div className="mt-2 rounded-md bg-amber-900/30 px-3 py-2 text-amber-400">
              Mock user mode
            </div>
          )}
        </div>
      </aside>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside 
          className={`hidden md:flex flex-col min-h-screen border-r border-[#2a2a2a] bg-[#1a1a1a] transition-all duration-300 ${sidebarWidth}`}
        >
          <div className={`px-4 pb-4 pt-6 ${sidebarCollapsed ? "px-2" : ""}`}>
            {!sidebarCollapsed && (
              <>
                <p className="text-xs uppercase tracking-wide text-gray-500">Manus dashboard</p>
                <h1 className="text-lg font-semibold text-white">Portfolio Control Center</h1>
              </>
            )}
            {sidebarCollapsed && (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
              </div>
            )}
          </div>
          
          <Separator className="bg-[#2a2a2a]" />
          
          <div className={`flex-1 py-4 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
            <Navigation isAdmin={isAdmin} collapsed={sidebarCollapsed} />
          </div>
          
          <Separator className="bg-[#2a2a2a]" />
          
          {/* Collapse toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center py-3 hover:bg-[#2a2a2a] transition-colors text-gray-400 hover:text-white"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
          
          {!sidebarCollapsed && (
            <div className="px-4 py-4 text-xs text-gray-400 border-t border-[#2a2a2a]">
              <div className="font-semibold text-gray-200">{user.name ?? user.email}</div>
              <div className="truncate">{persona}</div>
              {mock && (
                <div className="mt-2 rounded-md bg-amber-900/30 px-3 py-2 text-amber-400">
                  Mock user mode
                </div>
              )}
            </div>
          )}
        </aside>

        <div className="flex-1 flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-[#2a2a2a] bg-[#1a1a1a]/95 backdrop-blur-sm px-4 py-3 shadow-lg md:px-6">
            <div className="flex flex-col gap-3">
              {/* Top row */}
              <div className="flex items-center justify-between gap-4">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors touch-target tap-highlight-none"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-5 h-5 text-gray-400" />
                </button>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]">
                    {modeLabel}
                  </Badge>
                  <Badge variant={badgeVariant} className={
                    badgeVariant === "success" 
                      ? "bg-green-900/30 text-green-400 border-green-800" 
                      : badgeVariant === "warning"
                        ? "bg-amber-900/30 text-amber-400 border-amber-800"
                        : "bg-gray-800 text-gray-400 border-gray-700"
                  }>
                    {label}
                  </Badge>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                  <div className="rounded-full bg-[#2a2a2a] px-3 py-1.5">
                    API: {window.location.origin.replace(/https?:\/\//, "").slice(0, 20)}...
                  </div>
                  {mock && (
                    <div className="rounded-full bg-amber-900/30 px-3 py-1.5 text-amber-400">
                      Mock auth
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom row - Controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin scrollbar-dark pb-1 sm:pb-0">
                  <WorkspaceSelector
                    value={workspaceId}
                    options={workspaces}
                    loading={workspacesLoading}
                    onChange={setWorkspaceId}
                  />
                </div>
                <div className="flex-shrink-0">
                  <TimeRangeSelector
                    value={timeRange.preset}
                    onChange={preset => setTimeRange({ preset })}
                    presets={["1M", "3M", "6M", "YTD", "1Y", "ALL"]}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl w-full">
              {mock && (
                <div className="mb-4 rounded-lg border border-amber-800/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400 animate-fade-in">
                  Running in local mock mode. Data is scoped to a deterministic dev user.
                </div>
              )}
              <div className="animate-fade-in">
                {children}
              </div>
            </div>
          </main>
          
          {/* Mobile bottom navigation */}
          <nav className="mobile-bottom-nav" aria-label="Quick navigation">
            <NavButton icon={Home} label="Home" to="/" />
            <NavButton icon={BarChart3} label="Overview" to="/overview" />
            <NavButton icon={TrendingUp} label="Strategies" to="/strategies" />
            <NavButton icon={PieChart} label="Analytics" to="/analytics" />
            <NavButton icon={Settings} label="Settings" to="/settings" />
          </nav>
        </div>
      </div>
    </div>
  );
}

// Mobile bottom navigation button component
function NavButton({ icon: Icon, label, to }: { icon: React.ComponentType<{ className?: string }>; label: string; to: string }) {
  const isActive = window.location.pathname === to;
  
  return (
    <a
      href={to}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors tap-highlight-none ${
        isActive 
          ? "text-blue-400 bg-blue-900/20" 
          : "text-gray-500 hover:text-gray-300"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </a>
  );
}

export default DashboardLayout;
