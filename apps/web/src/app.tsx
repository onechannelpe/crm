import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { ToastProvider } from "~/components/feedback/toast-provider";
import { ToastContainer } from "~/components/feedback/toast";
import { Loading } from "~/components/feedback/loading";
import "./app.css";

export default function App() {
  return (
    <Router root={(props) => (
      <ToastProvider>
        <Suspense fallback={<Loading />}>
          {props.children}
        </Suspense>
        <ToastContainer />
      </ToastProvider>
    )}>
      <FileRoutes />
    </Router>
  );
}
