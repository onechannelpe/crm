import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";

import { enforceAuthRequest } from "~/lib/auth/access/request-auth";

export default createMiddleware({
  onRequest: async (event) => {
    const decision = await enforceAuthRequest(event);
    if (decision.kind === "reject") return decision.response;
    if (decision.kind === "redirect_login") return redirect("/login");
    if (decision.kind === "redirect_onboarding") return redirect("/onboarding");
    if (decision.kind === "redirect_dashboard") return redirect("/dashboard");
  },
});
