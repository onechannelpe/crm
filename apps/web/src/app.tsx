import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import { ToastContainer } from "./components/feedback/toast";
import { ToastProvider } from "./components/feedback/toast-provider";

import "./app.css";

export default function App() {
  return (
    <ToastProvider>
      <Router root={(props) => <Suspense>{props.children}</Suspense>}>
        <FileRoutes />
      </Router>
      <ToastContainer />
    </ToastProvider>
  );
}
