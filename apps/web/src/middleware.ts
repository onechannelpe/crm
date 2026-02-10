import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";
import { getCookie } from "vinxi/http";

export default createMiddleware({
  onRequest: (event) => {
    const url = new URL(event.request.url);
    const isPublic =
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/auth") ||
      url.pathname.startsWith("/_") ||
      url.pathname.includes(".");

    if (isPublic) return;

    const hasSession = !!getCookie(event.nativeEvent, "session");
    if (!hasSession) {
      return redirect("/login");
    }
  },
});
