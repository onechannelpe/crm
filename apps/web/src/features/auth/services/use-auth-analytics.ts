import { useAction } from "@solidjs/router";
import { onMount } from "solid-js";

import { trackAuthClientEventMutation } from "~/features/auth/data/analytics-mutations";
import {
  type AuthFunnelClientEventPayload,
  type AuthFunnelScreen,
} from "~/lib/observability/auth-funnel";

export function useAuthPageView(screen: AuthFunnelScreen): void {
  const trackAuthClientEvent = useAction(trackAuthClientEventMutation);

  onMount(() => {
    const event = {
      kind: "screen_viewed",
      screen,
    } satisfies AuthFunnelClientEventPayload;

    void trackAuthClientEvent(event);
  });
}
