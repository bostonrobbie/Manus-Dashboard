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
import Admin from "./pages/Admin";
import UserDashboard from "./pages/UserDashboard";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import CheckoutSuccess from "./pages/CheckoutSuccess";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      <Route path="/pricing" component={Pricing} />
      
      <Route path="/onboarding" component={Onboarding} />
      
      <Route path="/checkout/success" component={CheckoutSuccess} />
      
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
      
      <Route path="/admin" component={() => (
        <DashboardLayout>
          <Admin />
        </DashboardLayout>
      )} />
      
      <Route path="/my-dashboard" component={() => (
        <DashboardLayout>
          <UserDashboard />
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
