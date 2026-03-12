import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import { AppErrorBoundary } from "./components/feedback/error-boundary";
import { ToastContainer } from "./components/feedback/toast";
import { ToastProvider } from "./components/feedback/toast-provider";
import { ExtensionUIProvider } from "~/lib/extension/extension-ui-context";

import "./app.css";

export default function App() {
  return (
    <ToastProvider>
      <ExtensionUIProvider>
        <AppErrorBoundary>
          <Router root={(props) => <Suspense>{props.children}</Suspense>}>
            <FileRoutes />
          </Router>
        </AppErrorBoundary>
      </ExtensionUIProvider>
      <ToastContainer />
    </ToastProvider>
  );
}

