import type { APIEvent } from "@solidjs/start/server";

export function createApiEvent(request: Request): APIEvent {
  const event = {
    request,
    params: {},
    response: { headers: new Headers() },
    locals: {},
    nativeEvent: {},
  };

  // Route handlers under test read request fields only.
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return event as unknown as APIEvent;
}
