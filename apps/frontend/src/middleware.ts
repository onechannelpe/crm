import { createMiddleware } from "@solidjs/start/middleware";
import { getCookie } from "vinxi/http";
import { redirect } from "@solidjs/router";

export default createMiddleware({
  onRequest: [
    (event) => {
      const url = new URL(event.request.url);
      const isPublic =
        url.pathname.startsWith("/login") ||
        url.pathname.startsWith("/_") ||
        url.pathname.includes(".");

      const session = getCookie(event.nativeEvent, "session");
      if (session) {
        event.locals.session = session;
      }

      if (!isPublic && !session) {
        return redirect("/login");
      }
    },
  ],
});
