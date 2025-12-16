import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import StrategyDetail from "./pages/StrategyDetail";
import StrategyComparison from "./pages/StrategyComparison";
import Strategies from "./pages/Strategies";
import Webhooks from "./pages/Webhooks";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <DashboardLayout>
          <Overview />
        </DashboardLayout>
      )} />
      
      <Route path="/overview" component={() => (
        <DashboardLayout>
          <Overview />
        </DashboardLayout>
      )} />
      
      <Route path="/strategy/:id" component={() => (
        <DashboardLayout>
          <StrategyDetail />
        </DashboardLayout>
      )} />
      
      <Route path="/strategies" component={() => (
        <DashboardLayout>
          <Strategies />
        </DashboardLayout>
      )} />
      
      <Route path="/compare" component={() => (
        <DashboardLayout>
          <StrategyComparison />
        </DashboardLayout>
      )} />
      
      <Route path="/webhooks" component={() => (
        <DashboardLayout>
          <Webhooks />
        </DashboardLayout>
      )} />
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
