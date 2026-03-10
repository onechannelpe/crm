import { query } from "@solidjs/router";

import { getLoginFlow } from "~/actions/auth/login-flow";

export const loginFlowQuery = query(getLoginFlow, "auth.loginFlow");
