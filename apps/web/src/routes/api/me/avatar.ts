import type { APIEvent } from "@solidjs/start/server";

import { application } from "~/server/composition/application";
import { getSession } from "~/server/platform/action/session";
import { respondToAvatarRequest } from "~/server/users/avatar-http";

export async function GET(event: Pick<APIEvent, "request">): Promise<Response> {
  try {
    return await respondToAvatarRequest(
      event.request,
      await getSession(),
      application.users.avatars,
    );
  } catch {
    return new Response("Unexpected error", { status: 500 });
  }
}
