import { query } from "@solidjs/router";

import { getActiveLeads } from "~/actions/leads";

export const activeLeadsQuery = query(getActiveLeads, "activeLeads");
