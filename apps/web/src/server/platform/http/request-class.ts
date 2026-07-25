export type RequestClass = "machine" | "public" | "browser";

const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/reset-password",
  "/api/auth",
  "/auth",
  "/updates",
  "/docs",
];

const PUBLIC_ASSET_PREFIXES = [
  "/_",
  "/halftone/",
  "/illustrations/",
  "/images/",
];
const PUBLIC_EXACT = new Set([
  "/favicon.ico",
  "/privacy",
  "/robots.txt",
  "/terms",
]);

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
    PUBLIC_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ||
    PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_EXACT.has(pathname)
  );
}
