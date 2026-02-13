import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";
import { validateSessionToken } from "~/lib/auth/session-manager";
import { getSessionCookie } from "~/lib/auth/cookies";

export default createMiddleware({
    onRequest: async (event) => {
        const url = new URL(event.request.url);

        if (event.request.method !== "GET") {
            const origin = event.request.headers.get("Origin");
            const host = event.request.headers.get("Host");

            if (origin && new URL(origin).host !== host) {
                return new Response("CSRF validation failed", { status: 403 });
            }
        }

        const isPublic =
            url.pathname.startsWith("/login") ||
            url.pathname.startsWith("/auth") ||
            url.pathname.startsWith("/_") ||
            url.pathname.includes(".");

        if (isPublic) return;

        const token = getSessionCookie();
        if (!token) {
            return redirect("/login");
        }

        const { session } = await validateSessionToken(token);
        if (!session) {
            return redirect("/login");
        }

        event.locals = event.locals || {};
        event.locals.session = session;
    },
});
