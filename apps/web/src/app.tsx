import { withSentryRouterRouting } from "@sentry/solid/solidrouter";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { isServer } from "solid-js/web";

import { AppErrorBoundary } from "./components/feedback/error/boundary";
import { ToastContainer } from "./components/feedback/toast/container";
import { ToastProvider } from "./components/feedback/toast/provider";

import "./app.css";

const SentryRouter = isServer ? Router : withSentryRouterRouting(Router);

export default function App() {
  return (
    <ToastProvider>
      <AppErrorBoundary>
        <SentryRouter
          root={(props) => (
            <Suspense>{props.children}</Suspense>
          )}
        >
          <FileRoutes />
        </SentryRouter>
      </AppErrorBoundary>
      <ToastContainer />
    </ToastProvider>
  );
}
