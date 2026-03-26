import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import { AppErrorBoundary } from "./components/feedback/error-boundary";
import { ToastContainer } from "./components/feedback/toast";
import { ToastProvider } from "./components/feedback/toast-provider";
import { createDiagnostics } from "./lib/observability/diagnostics";

import "./app.css";

const diagnostics = createDiagnostics("app-root");

export default function App() {
  diagnostics.trace("ssr", "render");

  return (
    <ToastProvider>
      <AppErrorBoundary>
        <Router root={(props) => <Suspense>{props.children}</Suspense>}>
          <FileRoutes />
        </Router>
      </AppErrorBoundary>
      <ToastContainer />
    </ToastProvider>
  );
}
