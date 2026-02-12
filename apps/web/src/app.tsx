import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { ToastProvider } from "~/presentation/ui/feedback/toast-provider";
import { ToastContainer } from "~/presentation/ui/feedback/toast";
import "./app.css";

export default function App() {
  return (
    <ToastProvider>
      <Router root={(props) => (
        <Suspense fallback={<div>Cargando...</div>}>
          {props.children}
        </Suspense>
      )}>
        <FileRoutes />
      </Router>
      <ToastContainer />
    </ToastProvider>
  );
}
