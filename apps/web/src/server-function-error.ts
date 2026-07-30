import "server-only";
import { captureException } from "@sentry/bun";
import type { ServerFunctionErrorHandler } from "@solidjs/start/server";

import { ActionError } from "~/contracts/errors";
import { faultMeta } from "~/shared/observability/fault-meta";
import { createLogger } from "~/shared/observability/runtime-logger";

const SAFE_ERROR_MESSAGE = "No se pudo completar la solicitud.";

const logger = createLogger("server-function-fault");

const onServerFunctionError: ServerFunctionErrorHandler = async (thrown) => {
  if (thrown instanceof Response) {
    return thrown;
  }

  // Expected failures keep their wire payload so the client can still branch
  // on kind and code.
  if (thrown instanceof ActionError && thrown.wire.kind !== "internal") {
    return thrown;
  }

  logger.error("server_function_fault", faultMeta(thrown));
  captureException(thrown);

  return new Error(SAFE_ERROR_MESSAGE);
};

export default onServerFunctionError;
