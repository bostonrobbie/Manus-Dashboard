import DashboardLayout from "./components/DashboardLayout";
import Navigation from "./components/Navigation";
import DashboardNew from "./pages/DashboardNew";

function App() {
  return (
    <DashboardLayout>
      <Navigation />
      <DashboardNew />
    </DashboardLayout>
  );
}

export default App;
