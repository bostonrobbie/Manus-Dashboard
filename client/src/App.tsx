import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./components/DashboardLayout";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { useAuthState } from "./hooks/useAuthState";
import HomeDashboardPage from "./pages/HomeDashboardPage";
import OverviewPage from "./pages/Overview";
import SettingsPage from "./pages/Settings";
import StrategiesPage from "./pages/Strategies";
import TradesPage from "./pages/Trades";
import PortfoliosPage from "./pages/Portfolios";
import UploadsPage from "./pages/Uploads";
import AdminDataManagerPage from "./pages/AdminDataManager";
import { DashboardProvider } from "./providers/DashboardProvider";
import { isAdminUser } from "@shared/utils/auth";

function App() {
  const { viewer, isLoading, isError, refetch, errorReason } = useAuthState();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-sm text-slate-600">
        Checking authentication...
      </main>
    );
  }

  if (isError || !viewer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">
              {errorReason === "network" ? "Unable to reach auth service" : "Unable to determine user"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              {errorReason === "network"
                ? "The auth endpoint was unreachable. Ensure the API is up, then retry or open the Settings page for health signals."
                : "We couldn&apos;t determine the current user. Check Manus headers and retry."}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link to="/settings">Settings / Health</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!viewer.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">
              {viewer.mode === "manus" ? "Waiting for Manus authentication" : "User context missing"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              {viewer.mode === "manus" && viewer.strict
                ? "Manus mode is strict and no user headers were detected. Forward the configured Manus user/workspace headers or disable strict auth temporarily."
                : viewer.mode === "manus"
                  ? "Pass the configured Manus auth header or JWT so requests can be attributed to a user/workspace."
                  : "Enable the mock user path (MOCK_USER_ENABLED=true) or provide Manus headers to continue."}
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Configure <code>VITE_MANUS_AUTH_HEADER</code> and <code>VITE_MANUS_AUTH_TOKEN</code> for local testing.</li>
              <li>Ensure Manus reverse proxy forwards the user and workspace headers.</li>
              <li>Reload once headers are in place.</li>
            </ul>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => refetch()}>
                Re-check authentication
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link to="/settings">Settings / Health</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isAdmin = isAdminUser(viewer.user);

  return (
    <BrowserRouter>
          <DashboardProvider user={viewer.user}>
            <DashboardLayout user={viewer.user} mode={viewer.mode} mock={viewer.mock}>
              <Routes>
                <Route path="/" element={<HomeDashboardPage />} />
                <Route path="/overview" element={<OverviewPage />} />
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/portfolios" element={<PortfoliosPage />} />
            <Route path="/trades" element={<TradesPage />} />
            <Route path="/uploads" element={<UploadsPage />} />
            <Route path="/admin" element={isAdmin ? <AdminDataManagerPage /> : <Navigate to="/" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DashboardLayout>
      </DashboardProvider>
    </BrowserRouter>
  );
}

export default App;
