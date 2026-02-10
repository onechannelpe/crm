import type { Context, Next } from "hono";

const DEFAULT_ORIGIN = "http://localhost:3000";

function getAllowedOrigins(): string[] {
  const raw = process.env.AUTH_ORIGIN ?? DEFAULT_ORIGIN;
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function originMatchesHost(origin: string, host: string | null): boolean {
  if (!host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export async function csrfMiddleware(c: Context, next: Next) {
  if (c.req.method === "GET") {
    await next();
    return;
  }

  const origin = c.req.header("origin");

  // Allow server-to-server calls without Origin header
  // Server-side fetch (Node/Bun) doesn't include Origin by default
  if (!origin) {
    const host = c.req.header("host");
    // In development, allow same-host requests without Origin (server-to-server)
    // In production, this should be replaced with a shared secret or specific header check
    const isLocalhost =
      host?.includes("localhost") || host?.includes("127.0.0.1");

    if (isLocalhost) {
      await next();
      return;
    }
    return c.json({ error: "Forbidden" }, 403);
  }

  const allowedOrigins = getAllowedOrigins();
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? null;

  const allowed =
    allowedOrigins.includes(origin) || originMatchesHost(origin, host);

  if (!allowed) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
}
