import { query } from "@solidjs/router";

import { getTotpStatus } from "~/actions/auth";

export const totpStatusQuery = query(getTotpStatus, "totpStatus");
