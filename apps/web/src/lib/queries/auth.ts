import { query } from "@solidjs/router";

import { getLoginFlow, getMe } from "~/actions/auth/session";

export const loginFlowQuery = query(getLoginFlow, "auth.loginFlow");

export const meQuery = query(getMe, "auth.me");
