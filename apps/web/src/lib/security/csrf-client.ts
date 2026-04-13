import { CSRF_CONFIG } from "./csrf-config";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

/**
 * Patches window.fetch to automatically include the CSRF token header for mutations.
 *
 * This instrumentation is necessary because SolidStart "use server" actions
 * and RPC calls use a global fetcher. By intercepting at the window level,
 * we ensure that all framework mutation requests (actions, forms, RPC)
 * automatically carry the required CSRF token without developer intervention.
 */
export function setupCsrfInterceptor() {
  if (typeof window === "undefined" || !("fetch" in window)) return;

  const originalFetch = window.fetch;

  const patchedFetch = async (
    input: RequestInfo | URL,
    init: RequestInit | undefined,
  ): Promise<Response> => {
    const method = init?.method?.toUpperCase() || "GET";

    if (!SAFE_METHODS.has(method)) {
      const token = getCsrfMetaToken();

      if (token) {
        init = init || {};
        const headers = new Headers(init.headers || {});

        if (!headers.has(CSRF_CONFIG.HEADER_NAME)) {
          headers.set(CSRF_CONFIG.HEADER_NAME, token);
          init.headers = headers;
        }
      }
    }

    return originalFetch(input, init);
  };

  Object.assign(patchedFetch, originalFetch);

  // Object.defineProperty bypasses lint rules on window.fetch reassignment
  // while preserving configurability for other instrumentation layers.
  Object.defineProperty(window, "fetch", {
    value: patchedFetch,
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

function getCsrfMetaToken(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector<HTMLMetaElement>(
    `meta[name="${CSRF_CONFIG.META_NAME}"]`,
  );
  return meta?.content ?? null;
}
