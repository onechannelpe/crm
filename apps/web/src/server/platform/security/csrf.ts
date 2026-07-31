import { timingSafeEqual } from "node:crypto";

import { CSRF_CONFIG } from "~/shared/csrf-config";

export function verifyCsrf(request: Request, expectedToken: string): boolean {
  const headerToken = request.headers.get(CSRF_CONFIG.HEADER_NAME);

  if (!headerToken) {
    return false;
  }

  // timingSafeEqual throws if the buffers have different lengths.
  const headerBuf = Buffer.from(headerToken, "utf8");
  const expectedBuf = Buffer.from(expectedToken, "utf8");

  if (headerBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(headerBuf, expectedBuf);
}
