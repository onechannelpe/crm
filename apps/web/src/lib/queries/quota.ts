import { query } from "@solidjs/router";

import { getQuotaStatus } from "~/actions/quota";

export const quotaStatusQuery = query(getQuotaStatus, "quotaStatus");
