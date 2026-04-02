import { query } from "@solidjs/router";

import { getActiveContactAssignments } from "~/actions/contact-assignments/read";

export const activeContactAssignmentsQuery = query(
  getActiveContactAssignments,
  "activeContactAssignments",
);
