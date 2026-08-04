import { definePlugin } from "nitro";

import { application } from "~/server/composition/application";

export default definePlugin((nitroApp) => {
  if (import.meta.prerender) {
    return;
  }

  application.realtime.start();
  nitroApp.hooks.hook("close", () => application.realtime.stop());
});
