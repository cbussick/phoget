import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource-variable/nunito";
import "./tokens.css";
import "./baseline.css";
import "./styles.css";
import "../shared/ui/controls.css";
import "./extensions.css";
import { App } from "./App";
import { SnackbarProvider } from "../shared/ui/Snackbar/Snackbar";
import { ErrorBoundary } from "./ErrorBoundary";

const queryClient = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <App />
        </SnackbarProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
