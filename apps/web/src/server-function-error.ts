import "server-only";
import { captureException } from "@sentry/bun";
import type { ServerFunctionErrorHandler } from "@solidjs/start/server";

import { ActionError } from "~/contracts/errors";

const SAFE_ERROR_MESSAGE = "No se pudo completar la solicitud.";

const onServerFunctionError: ServerFunctionErrorHandler = async (thrown) => {
  if (thrown instanceof Response) {
    return thrown;
  }

  if (thrown instanceof ActionError && thrown.wire.kind !== "internal") {
    return thrown;
  }

  const { captureException } = await import("@sentry/bun");
  captureException(thrown);

  return new Error(SAFE_ERROR_MESSAGE);
};

export default onServerFunctionError;
