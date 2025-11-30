import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";
import App from "./App";
import "./index.css";
import { trpc } from "./lib/trpc";
import { getWorkspaceHeaderValue } from "./lib/workspaceHeaders";

const queryClient = new QueryClient();

const getBaseUrl = () => {
  if (typeof window === "undefined") return "";
  const apiUrl = import.meta.env.VITE_API_URL?.trim();
  if (apiUrl && apiUrl.length > 0) return apiUrl.replace(/\/$/, "");
  return window.location.origin.replace(/\/$/, "");
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      transformer: SuperJSON,
      headers() {
        const headers: Record<string, string> = {};
        const manusHeader = import.meta.env.VITE_MANUS_AUTH_HEADER?.trim();
        const manusToken = import.meta.env.VITE_MANUS_AUTH_TOKEN?.trim();
        const workspaceHeader = import.meta.env.VITE_MANUS_WORKSPACE_HEADER?.trim();
        const workspaceId = getWorkspaceHeaderValue() ?? import.meta.env.VITE_MANUS_WORKSPACE_ID?.trim();

        if (manusHeader && manusToken) headers[manusHeader] = manusToken;
        if (workspaceHeader && workspaceId) headers[workspaceHeader] = workspaceId;
        return headers;
      },
    }),
  ],
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
