import { query } from "@solidjs/router";

import { getMyContactAssignmentCapacity } from "~/server/contact-assignments/ui/queries";

export const myContactAssignmentCapacityQuery = query(
  async () => {
    "use server";
    return getMyContactAssignmentCapacity();
  },
  "capacity.my-contact-assignment",
);
