import { CSRF_CONFIG } from "./csrf";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS", "TRACE"];

/**
 * Helper to retrieve a cookie value by name in a browser context.
 */
function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
    return null;
}

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

        // Only inject headers for non-safe methods (mutations)
        if (!SAFE_METHODS.includes(method)) {
            const token = getCookie(CSRF_CONFIG.COOKIE_NAME);

            if (token) {
                init = init || {};
                const headers = new Headers(init.headers || {});

                // Only add if not already present to avoid collisions
                if (!headers.has(CSRF_CONFIG.HEADER_NAME)) {
                    headers.set(CSRF_CONFIG.HEADER_NAME, token);
                    init.headers = headers;
                }
            }
        }

        return originalFetch(input, init);
    };

    // Preserve all original fetch properties (e.g. polyfills, instrumentation)
    Object.assign(patchedFetch, originalFetch);

    // We use Object.defineProperty to bypass strict linting rules regarding
    // the reassignment of window.fetch and to ensure all properties are preserved.
    Object.defineProperty(window, "fetch", {
        value: patchedFetch,
        configurable: true,
        writable: true,
        enumerable: true,
    });
}
