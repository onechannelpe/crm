import { readAuthFunnelClientEvent } from "~/domain/observability/auth-funnel";
import { getApplication } from "~/server/composition/application";
import { getRequestOperation } from "~/server/platform/http/request-context-storage";
import { getActionRequestContext } from "~/server/platform/observability/context";

export async function trackAuthClientEvent(input: unknown): Promise<void> {
  "use server";

  const event = readAuthFunnelClientEvent(input);
  if (!event) {
    return;
  }

  await getApplication().auth.analytics(
    {
      source: "client",
      ...event,
    },
    getActionRequestContext(),
    getRequestOperation(),
  );
}
