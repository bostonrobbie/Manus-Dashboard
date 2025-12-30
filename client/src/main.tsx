import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { ContractSizeProvider } from "@/contexts/ContractSizeContext";
import { AccountValueProvider } from "@/contexts/AccountValueContext";
import {
  initSentry,
  captureException,
  SentryErrorBoundary,
} from "@/lib/sentry";

// Initialize Sentry before anything else
initSentry();

// Suppress Vite HMR websocket errors in development (expected in proxy environments)
if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      (message.includes("[vite] failed to connect to websocket") ||
        message.includes("WebSocket connection") ||
        (message.includes("HMR") && message.includes("failed")))
    ) {
      // Silently ignore HMR connection errors in proxy environments
      console.debug(
        "[HMR] WebSocket connection issue (expected in proxy environment)"
      );
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Also suppress unhandled promise rejections for WebSocket errors
  window.addEventListener("unhandledrejection", event => {
    const reason = event.reason;
    if (
      reason instanceof Error &&
      (reason.message.includes("WebSocket") ||
        reason.message.includes("websocket") ||
        reason.message.includes("HMR"))
    ) {
      event.preventDefault();
      console.debug("[HMR] WebSocket error suppressed:", reason.message);
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time of 2 minutes - data won't refetch unless stale
      staleTime: 2 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Retry failed queries with exponential backoff
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once on network errors
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;
  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    // Only log non-network errors to avoid noise
    if (error instanceof Error && !isNetworkError(error)) {
      console.error("[API Query Error]", error);
      captureException(error, { type: "query" });
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    // Only log non-network errors to avoid noise
    if (error instanceof Error && !isNetworkError(error)) {
      console.error("[API Mutation Error]", error);
      captureException(error, { type: "mutation" });
    }
  }
});

// Helper to identify transient network errors
function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("econnrefused") ||
    message.includes("websocket")
  );
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <SentryErrorBoundary fallback={<ErrorFallback />}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ContractSizeProvider>
          <AccountValueProvider>
            <App />
          </AccountValueProvider>
        </ContractSizeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </SentryErrorBoundary>
);

// Error fallback component
function ErrorFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          We've been notified and are working to fix the issue. Please try
          refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
