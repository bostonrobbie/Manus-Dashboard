import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useDashboardState } from "../providers/DashboardProvider";

function AdminDataManagerPage() {
  const { isAdmin } = useDashboardState();

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Admin access required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          You need an administrator role to access data management tools.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Admin data tools unavailable</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        Workspace-specific administration features are disabled on the Manus single-tenant runtime. Contact support if you
        need assistance managing uploads or data cleanup.
      </CardContent>
    </Card>
  );
}

export default AdminDataManagerPage;
