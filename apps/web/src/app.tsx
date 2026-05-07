import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import { AppErrorBoundary } from "./components/feedback/error/boundary";
import { SnackBarProvider } from "./components/feedback/snack-bar-manager/components/snack-bar-provider";

import "./app.css";

export default function App() {
  return (
    <SnackBarProvider>
      <AppErrorBoundary>
        <Router root={(props) => <Suspense>{props.children}</Suspense>}>
          <FileRoutes />
        </Router>
      </AppErrorBoundary>
    </SnackBarProvider>
  );
}
