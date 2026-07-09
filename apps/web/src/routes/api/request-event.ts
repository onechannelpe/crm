import type { APIEvent } from "@solidjs/start/server";

export type ApiRequestEvent = Pick<APIEvent, "request">;
