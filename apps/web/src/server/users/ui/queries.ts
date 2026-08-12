import type { MemberDetail, MembersRoster } from "~/contracts/members";
import { UserId } from "~/domain/ids";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function getMembersRoster(): Promise<MembersRoster> {
  return executeSessionServerFunction({
    name: "members.roster.read",
    access: { kind: "permission", permission: "team:read" },
    execute: (ctx) => getApplication().users.members.listRoster(ctx),
  });
}

export async function getMemberDetail(
  rawUserId: unknown,
): Promise<MemberDetail> {
  return executeSessionServerFunction({
    name: "members.detail.read",
    access: { kind: "permission", permission: "team:read" },
    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),
    execute: (ctx, command) =>
      getApplication().users.members.getDetail(ctx, command.userId),
  });
}
