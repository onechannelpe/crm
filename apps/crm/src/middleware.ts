import { createMiddleware } from "@solidjs/start/middleware";
import { getCookie, setCookie } from "vinxi/http";
import { globalBucket } from "./lib/auth/ratelimit";
import { validateSessionToken } from "./lib/auth/session";

export default createMiddleware({
  onRequest: [
    async (event) => {
      // Rate limiting
      const ip = event.request.headers.get("x-forwarded-for") || "127.0.0.1";
      if (!globalBucket.consume(ip, 1)) {
        return new Response("Too Many Requests", { status: 429 });
      }

      // CSRF check for non-GET
      if (event.request.method !== "GET") {
        const origin = event.request.headers.get("Origin");
        const host = event.request.headers.get("Host");
        if (!origin || (host && !origin.includes(host))) {
          return new Response("Forbidden", { status: 403 });
        }
      }

      // Session validation
      const token = getCookie(event.nativeEvent, "session");
      if (token) {
        const { session, user } = validateSessionToken(token);
        if (session) {
          event.locals.user = user;
          event.locals.session = session;
          // Refresh cookie
          setCookie(event.nativeEvent, "session", token, {
            httpOnly: true,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
          });
        }
      }
    },
  ],
});
