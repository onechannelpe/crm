// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

import { setupCsrfInterceptor } from "./lib/security/csrf-client";

setupCsrfInterceptor();

const app = document.getElementById("app");
if (!app) {
  throw new Error("Missing #app root element");
}

mount(() => <StartClient />, app);
