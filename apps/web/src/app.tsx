import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import { AppErrorBoundary } from "./components/feedback/error/boundary";
import { SnackBarProvider } from "./components/feedback/snack-bar-manager/snack-bar-provider";
import { ThemeProvider } from "./components/ui/theme/theme-context";

import "./app.css";

export default function App() {
  return (
    <ThemeProvider>
      <SnackBarProvider>
        <AppErrorBoundary>
          <Router
            root={(props) => (
              <MetaProvider>
                <Title>Culqi360</Title>
                <Suspense>{props.children}</Suspense>
              </MetaProvider>
            )}
          >
            <FileRoutes />
          </Router>
        </AppErrorBoundary>
      </SnackBarProvider>
    </ThemeProvider>
  );
}
