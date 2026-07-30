import "server-only";
import type { ServerFunctionErrorHandler } from "@solidjs/start/server";

const SAFE_ERROR_MESSAGE = "No se pudo completar la solicitud.";

const onServerFunctionError: ServerFunctionErrorHandler = async (thrown) => {
  if (thrown instanceof Response) {
    return thrown;
  }

  const { captureException } = await import("@sentry/bun");
  captureException(thrown);

  return new Error(SAFE_ERROR_MESSAGE);
};

export default onServerFunctionError;
