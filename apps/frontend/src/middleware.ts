import { createMiddleware } from "@solidjs/start/middleware";
import { getCookie } from "vinxi/http";
import { redirect } from "@solidjs/router";

export default createMiddleware({
    onRequest: [
        (event) => {
            const url = new URL(event.request.url);

            // Global boundary for all app routes except login and public assets
            if (!url.pathname.startsWith("/login") && !url.pathname.startsWith("/_") && !url.pathname.includes(".")) {
                const session = getCookie(event as any, "session");
                if (!session) {
                    return redirect("/login");
                }
            }
        },
    ],
});
