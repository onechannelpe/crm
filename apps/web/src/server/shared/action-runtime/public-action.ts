import { ActionError } from "~/lib/wire-error";

import { faultToWire } from "./fault-boundary";
import { defaultPorts } from "./ports";

/**
 * The unauthenticated sibling of `runAction`. Auth/login endpoints create the
 * actor that `runAction` presupposes, so they cannot run the identity pipeline
 * (authenticate -> authorize -> step-up -> actor telemetry). They ride only the
 * shared fault boundary: expected outcomes are encoded in the returned value
 * (e.g. `{ ok: false, code }`), so only faults and control flow throw.
 *
 * `Response` (redirects) passes through untouched. An already-projected
 * `ActionError` is rethrown as-is. Anything else is an uncaught server bug:
 * it is reported and folded to an `internal` wire error instead of leaking.
 *
 * No actor-keyed telemetry row is written here: there is no actor to attribute,
 * and these endpoints already record their own domain auth events
 * (`recordAuthEvent`) and analytics. Naming this boundary makes the trust
 * boundary obvious at the call site for security review.
 */
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
