import { query } from "@solidjs/router";

import { getMyContactAssignmentCapacity } from "~/actions/contact-assignments/read";

export const myContactAssignmentCapacityQuery = query(
  getMyContactAssignmentCapacity,
  "myContactAssignmentCapacity",
);
