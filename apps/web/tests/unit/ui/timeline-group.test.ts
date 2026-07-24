import { describe, expect, it } from "vitest";

import { groupEventsByMonth } from "~/features/record-show/tabs/timeline/model/group";

describe("groupEventsByMonth", () => {
  it("groups events by the application time zone", () => {
    const groups = groupEventsByMonth([
      {
        id: "event-1",
        createdAt: Date.UTC(2026, 7, 1, 3),
        name: "lead.updated",
        author: "Admin",
        action: "actualizó",
        subject: "Cliente",
        kind: "system",
      },
    ]);

    // Aug 1 03:00 UTC falls on July 31 in app time (UTC-05:00), so it groups into July.
    expect(groups).toMatchObject([{ month: "2026-07" }]);
  });
});
