import { query } from "@solidjs/router";

type GetMyContactAssignmentCapacity =
  (typeof import("~/actions/contact-assignments/read.action"))["getMyContactAssignmentCapacity"];

export const myContactAssignmentCapacityQuery = query(
  async (...args: Parameters<GetMyContactAssignmentCapacity>) => {
    "use server";

    const { getMyContactAssignmentCapacity } =
      await import("~/actions/contact-assignments/read.action");
    return getMyContactAssignmentCapacity(...args);
  },
  "capacity.my-contact-assignment",
);
