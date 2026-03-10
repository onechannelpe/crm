import { useAction } from "@solidjs/router";
import { onMount } from "solid-js";

import {
  type AuthAnalyticsScreen,
  type AuthClientAnalyticsEvent,
} from "~/lib/auth/auth-analytics";
import { trackAuthClientEventMutation } from "~/lib/mutations/auth-analytics";

export function useAuthPageView(screen: AuthAnalyticsScreen): void {
  const trackAuthClientEvent = useAction(trackAuthClientEventMutation);

  onMount(() => {
    const event = {
      kind: "screen_viewed",
      screen,
    } satisfies AuthClientAnalyticsEvent;

    void trackAuthClientEvent(event);
  });
}
