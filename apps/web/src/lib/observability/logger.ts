import { isServer } from "solid-js/web";

import type { Logger } from "./logger-shared";
import { createLogger as createClientLogger } from "./logger.client";
import { createLogger as createServerLogger } from "./logger.server";

export type { Logger } from "./logger-shared";

export function createLogger(
  component: string,
  baseMeta: Record<string, unknown> = {},
): Logger {
  return isServer
    ? createServerLogger(component, baseMeta)
    : createClientLogger(component, baseMeta);
}
