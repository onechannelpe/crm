import { query } from "@solidjs/router";

import { getMe } from "~/actions/auth/session";

export const meQuery = query(getMe, "auth.me");
