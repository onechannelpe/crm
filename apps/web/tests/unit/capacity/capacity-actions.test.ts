import { describe, expect, it } from "vitest";

import { getAuditEvents } from "~/actions/capacity/read";
import { AppError } from "~/lib/app-errors";

async function expectInvalidLimit(limit: number) {
  await expect(getAuditEvents(limit)).rejects.toMatchObject({
    code: "validation",
    domainCode: "invalid_limit",
  } satisfies Partial<AppError>);
}

describe("capacity actions", () => {
  it("rejects non-positive audit limits before auth/runtime work", async () => {
    await expectInvalidLimit(0);
    await expectInvalidLimit(-1);
  });

  it("rejects fractional audit limits before auth/runtime work", async () => {
    await expectInvalidLimit(1.5);
  });
});
