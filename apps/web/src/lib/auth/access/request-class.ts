// One owner for "what auth posture does this path have". Secure by default:
// any path that is not explicitly public or machine is a browser route, so a
// new route is authenticated unless someone opts it out on purpose.

export type RequestClass = "machine" | "public" | "browser";

const PUBLIC_PREFIXES = [
  "/login",
  "/reset-password",
  "/api/auth",
  "/auth",
  "/_",
  "/updates",
  "/docs",
];

const PUBLIC_EXACT = new Set(["/privacy", "/terms"]);

// Inbound provider webhooks. Authenticated by signature at the transport layer,
// never by a browser session. One namespace, one policy: a future provider
// drops in under /api/webhooks/<provider> and inherits the machine posture.
const MACHINE_PREFIXES = ["/api/webhooks/"];

export function classifyRequest(pathname: string): RequestClass {
  if (MACHINE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return "machine";
  }
  if (isPublicPath(pathname)) return "public";
  return "browser";
}

export function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_EXACT.has(pathname) ||
    // Static assets carry a file extension.
    pathname.includes(".")
  );
}
