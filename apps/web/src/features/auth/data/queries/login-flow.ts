import { query } from "@solidjs/router";

import { getLoginFlow } from "~/actions/auth/session";

export const loginFlowQuery = query(getLoginFlow, "auth.loginFlow");
