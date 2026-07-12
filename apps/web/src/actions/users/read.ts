"use server";

import type { MemberDetail, MembersRoster } from "~/contracts/members";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";

export async function getMembersRoster(): Promise<MembersRoster> {
  return runAction({
    name: "members.roster.read",
    access: { kind: "permission", permission: "team:read" },
    execute: (ctx) => getServerRuntime().users.members.listRoster(ctx),
  });
}

export async function getMemberDetail(
  rawUserId: unknown,
): Promise<MemberDetail> {
  return runAction({
    name: "members.detail.read",
    access: { kind: "permission", permission: "team:read" },
    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),
    execute: (ctx, command) =>
      getServerRuntime().users.members.getDetail(ctx, command),
  });
}
