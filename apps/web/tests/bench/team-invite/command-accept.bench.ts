import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import { createInviteService } from "~/server/invites/application/invite-service";
import type { InviteService } from "~/server/invites/application/types";
import { bindInviteRepos } from "~/server/invites/infrastructure/invite-service-factory";
import { createExecutorUow } from "~/server/platform/database/uow";

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
    const inviteService = createInviteService(bindInviteRepos(ctx.db), {
      uow: createExecutorUow(ctx.db, bindInviteRepos),
      hashPassword: async () => "bench-password-hash",
    });
    inviteAccept = (input) => inviteService.acceptInvite(input, BENCH_NOW);
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
