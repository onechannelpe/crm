import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";
import { getAuthSession } from "~/infrastructure/auth/session";

export default createMiddleware({
  onRequest: async (event) => {
    const url = new URL(event.request.url);
    
    const isPublic =
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/auth") ||
      url.pathname.startsWith("/_") ||
      url.pathname.includes(".");

    if (isPublic) return;

    const session = await getAuthSession();
    
    if (!session.data.userId) {
      return redirect("/login");
    }
  },
});
