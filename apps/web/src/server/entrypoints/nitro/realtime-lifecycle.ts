import { definePlugin } from "nitro";

import { getApplication } from "~/server/composition/application";

export default definePlugin((nitroApp) => {
  if (import.meta.prerender) {
    return;
  }

  // Build the application at startup and keep it for shutdown.
  const application = getApplication();

  application.realtime.start();

  nitroApp.hooks.hook("close", () => application.realtime.stop());
});
