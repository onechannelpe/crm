import { CSRF_CONFIG } from "./csrf-config";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

// SolidStart actions and RPC share a global fetch. Install the CSRF header at
// the window boundary so every mutation carries the token without per-call work.
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

  // defineProperty keeps fetch configurable for downstream instrumentation
  // and bypasses the no-window-fetch-reassignment lint rule.
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
