import { query } from "@solidjs/router";

type GetMemberDetail =
  (typeof import("~/actions/users/read.action"))["getMemberDetail"];

export const memberDetailQuery = query(
  async (...args: Parameters<GetMemberDetail>) => {
    "use server";

    const { getMemberDetail } = await import("~/actions/users/read.action");
    return getMemberDetail(...args);
  },
  "team.member-detail",
);
