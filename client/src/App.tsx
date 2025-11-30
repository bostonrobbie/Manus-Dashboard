import DashboardLayout from "./components/DashboardLayout";
import Navigation from "./components/Navigation";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { useAuthState } from "./hooks/useAuthState";
import DashboardNew from "./pages/DashboardNew";

function App() {
  const { viewer, isLoading, isError, refetch } = useAuthState();

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
            <CardTitle className="text-base">Unable to reach auth service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>We couldn&apos;t determine the current user. Please retry.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
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
              {viewer.mode === "manus"
                ? "Pass the configured Manus auth header or JWT so requests can be attributed to a user/workspace."
                : "Enable the mock user path (MOCK_USER_ENABLED=true) or provide Manus headers to continue."}
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Configure <code>VITE_MANUS_AUTH_HEADER</code> and <code>VITE_MANUS_AUTH_TOKEN</code> for local testing.</li>
              <li>Ensure Manus reverse proxy forwards the user and workspace headers.</li>
              <li>Reload once headers are in place.</li>
            </ul>
            <Button size="sm" onClick={() => refetch()}>
              Re-check authentication
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <DashboardLayout user={viewer.user} mode={viewer.mode} mock={viewer.mock}>
      <Navigation />
      <DashboardNew />
    </DashboardLayout>
  );
}

export default App;
