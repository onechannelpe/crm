import { ActionError } from "~/lib/wire-error";

import { faultToWire } from "./fault-boundary";
import { defaultPorts } from "./ports";

// Public auth endpoints create the actor, so the runner only enforces the
// fault boundary, not authn.
export async function runPublicAction<T>(
  execute: () => Promise<T>,
): Promise<T> {
  try {
    return await execute();
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof ActionError) throw error;
    throw new ActionError(faultToWire(error, defaultPorts));
  }
}
