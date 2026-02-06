import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { seedDatabase } from "./lib/db/seed";
import "./app.css";

if (typeof window === "undefined") {
  seedDatabase().catch(console.error);
}

export default function App() {
  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}
