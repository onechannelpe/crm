import { operationAt } from "@tests/support/operation";
import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import type { InviteService } from "~/server/invites/application/types";
import { createInviteServiceForExecutor } from "~/server/invites/infrastructure/invite-service-factory";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { seedPendingInvite } from "./fixtures";

describe("team invite accept command benchmark", () => {
  const db = createBenchDbFixture("bench-team-invite-accept-command");
  let inviteAccept!: (
    input: Parameters<InviteService["acceptInvite"]>[0],
  ) => ReturnType<InviteService["acceptInvite"]>;
  let token = "";

  beforeAll(async () => {
    const ctx = await db.setup();
    const inviteService = createInviteServiceForExecutor(ctx.db);
    inviteAccept = (input) =>
      inviteService.acceptInvite(input, operationAt(BENCH_NOW));
  });

  beforeEach(async () => {
    token = (await seedPendingInvite(db.ctx())).token;
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "command path: accept invite",
    async () => {
      const result = await inviteAccept({
        token,
        password: "StrongPass123",
      });

      if (!result.ok) {
        throw new Error(
          `expected invite accept success, got ${result.error.code ?? result.error.kind}`,
        );
      }
    },
    SINGLE_CALL,
  );
});
