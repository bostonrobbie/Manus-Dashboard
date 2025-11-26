import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";
import App from "./App";
import "./index.css";
import { trpc } from "./lib/trpc";

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${(import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/$/, "")}/trpc`,
      transformer: SuperJSON,
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
