import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
const externalMatches = [
  process.env.CRM_WEB_ORIGIN?.trim(),
  "http://127.0.0.1/*",
  "http://localhost/*",
].filter((value): value is string => typeof value === "string" && value !== "");

export default defineConfig({
  modules: ["@wxt-dev/module-solid"],
  manifest: {
    name: "CRM call companion",
    description:
      "Persistent VoIP session state, recording queue, and offline-first sync.",
    permissions: ["storage", "alarms", "offscreen", "tabCapture", "activeTab", "sidePanel"],
    host_permissions: ["http://127.0.0.1/*", "http://localhost/*"],
    externally_connectable: {
      matches: externalMatches,
    },
    side_panel: {
      default_path: "sidepanel.html",
    },
  },
});
