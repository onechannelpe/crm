import { query } from "@solidjs/router";

import { getMyLeadCapacity } from "~/actions/lead-operations/read";

export const myLeadCapacityQuery = query(getMyLeadCapacity, "myLeadCapacity");
