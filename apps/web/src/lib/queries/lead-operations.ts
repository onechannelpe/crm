import { query } from "@solidjs/router";

import { getMyLeadCapacity } from "~/actions/leads/read";

export const myLeadCapacityQuery = query(getMyLeadCapacity, "myLeadCapacity");
