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
import {
  createResilientTRPCFetch,
  onConnectionChange,
  getConnectionState,
} from "@/lib/resilientFetch";

// Initialize Sentry before anything else
initSentry();

// Connection state for UI feedback
let connectionLostToastShown = false;

// Subscribe to connection changes for user feedback
onConnectionChange(online => {
  if (!online && !connectionLostToastShown) {
    connectionLostToastShown = true;
    showConnectionToast("Connection lost. Retrying...", "warning");
  } else if (online && connectionLostToastShown) {
    connectionLostToastShown = false;
    showConnectionToast("Connection restored!", "success");
  }
});

// Simple toast notification for connection status
function showConnectionToast(message: string, type: "warning" | "success") {
  const existingToast = document.getElementById("connection-toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = "connection-toast";
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideUp 0.3s ease-out;
    ${
      type === "warning"
        ? "background: #f59e0b; color: #000;"
        : "background: #10b981; color: #fff;"
    }
  `;
  toast.textContent = message;

  // Add animation keyframes if not present
  if (!document.getElementById("toast-animations")) {
    const style = document.createElement("style");
    style.id = "toast-animations";
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto-remove success toasts after 3 seconds
  if (type === "success") {
    setTimeout(() => toast.remove(), 3000);
  }
}

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

// Enhanced QueryClient with robust retry and error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time of 2 minutes - data won't refetch unless stale
      staleTime: 2 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Enhanced retry with more attempts for network issues
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (
          error instanceof TRPCClientError &&
          error.message === UNAUTHED_ERR_MSG
        ) {
          return false;
        }
        // Retry up to 4 times for network errors
        if (isNetworkError(error as Error)) {
          return failureCount < 4;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: attemptIndex => {
        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * Math.pow(2, attemptIndex), 30000);
        // Add jitter to prevent thundering herd
        return delay + Math.random() * 1000;
      },
      // Network mode: always try to fetch, even if offline (will queue)
      networkMode: "offlineFirst",
    },
    mutations: {
      // Enhanced retry for mutations
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (
          error instanceof TRPCClientError &&
          error.message === UNAUTHED_ERR_MSG
        ) {
          return false;
        }
        // Retry network errors once
        if (isNetworkError(error as Error)) {
          return failureCount < 2;
        }
        return failureCount < 1;
      },
      retryDelay: attemptIndex =>
        Math.min(1000 * Math.pow(2, attemptIndex), 10000),
      networkMode: "offlineFirst",
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
    message.includes("websocket") ||
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("abort")
  );
}

// Create resilient fetch for tRPC
const resilientFetch = createResilientTRPCFetch({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 15000,
  timeout: 30000,
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: resilientFetch,
      // Batch requests for efficiency but with reasonable limits
      maxURLLength: 2000,
    }),
  ],
});

// Periodic connection check to proactively detect issues
setInterval(() => {
  if (!getConnectionState()) {
    // If we think we're offline, invalidate stale queries when we come back
    queryClient.invalidateQueries({ stale: true });
  }
}, 60000);

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

// Enhanced error fallback component with retry functionality
function ErrorFallback() {
  const handleRetry = () => {
    // Clear all queries and refetch
    queryClient.clear();
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. This has been reported and we're
          working to fix it.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
