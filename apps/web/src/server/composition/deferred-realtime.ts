import type { RealtimeChannel } from "~/server/realtime/channel";
import type { RealtimeService } from "~/server/realtime/runtime";

// The realtime runtime depends on SolidStart server-only APIs, but this module
// is also imported from build and worker contexts. Load it only when realtime
// is actually used.
export function createDeferredRealtimeService(config: {
  channels: readonly RealtimeChannel[];
  databaseUrl: string;
}): RealtimeService {
  let instance: Promise<RealtimeService> | null = null;

  function getRealtime(): Promise<RealtimeService> {
    instance ??= import("~/server/realtime/runtime").then(
      ({ createRealtimeService }) => createRealtimeService(config),
    );

    return instance;
  }

  return {
    start: () => {
      void getRealtime().then((realtime) => realtime.start());
    },

    stop: async () => {
      if (!instance) {
        return;
      }

      const realtime = await instance;
      await realtime.stop();
    },

    openStream: (h3Event, request) =>
      getRealtime().then((realtime) => realtime.openStream(h3Event, request)),
  };
}
