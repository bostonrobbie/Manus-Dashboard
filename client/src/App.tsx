import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { Loader2 } from "lucide-react";

// Lazy load page components for better initial load performance
const Overview = lazy(() => import("./pages/Overview"));
const StrategyDetail = lazy(() => import("./pages/StrategyDetail"));
const StrategyComparison = lazy(() => import("./pages/StrategyComparison"));
const Strategies = lazy(() => import("./pages/Strategies"));
const Admin = lazy(() => import("./pages/Admin"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const QADashboard = lazy(() => import("./pages/QADashboard"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={() => (
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
        )} />
        
        <Route path="/pricing" component={() => (
          <Suspense fallback={<PageLoader />}>
            <Pricing />
          </Suspense>
        )} />
        
        <Route path="/onboarding" component={() => (
          <Suspense fallback={<PageLoader />}>
            <Onboarding />
          </Suspense>
        )} />
        
        <Route path="/checkout/success" component={() => (
          <Suspense fallback={<PageLoader />}>
            <CheckoutSuccess />
          </Suspense>
        )} />
        
        <Route path="/overview" component={() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Overview />
            </Suspense>
          </DashboardLayout>
        )} />
        
        <Route path="/strategy/:id" component={() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <StrategyDetail />
            </Suspense>
          </DashboardLayout>
        )} />
        
        <Route path="/strategies" component={() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Strategies />
            </Suspense>
          </DashboardLayout>
        )} />
        
        <Route path="/compare" component={() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <StrategyComparison />
            </Suspense>
          </DashboardLayout>
        )} />
        
        <Route path="/admin" component={() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Admin />
            </Suspense>
          </DashboardLayout>
        )} />
        
        <Route path="/my-dashboard" component={() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <UserDashboard />
            </Suspense>
          </DashboardLayout>
        )} />
        
        <Route path="/qa" component={() => {
          // Redirect to Admin page with QA tab
          window.location.href = '/admin?tab=qa';
          return <PageLoader />;
        }} />
        
        <Route path="/404" component={() => (
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        )} />
        <Route component={() => (
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        )} />
      </Switch>
    </Suspense>
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
