import "server-only";
import type { MemberDetail, MembersRoster } from "~/contracts/members";
import { UserId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";

export async function getMembersRoster(): Promise<MembersRoster> {
  return executeSessionServerFunction({
    name: "members.roster.read",
    access: { kind: "permission", permission: "team:read" },
    execute: (ctx) => application.users.members.listRoster(ctx),
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
      application.users.members.getDetail(ctx, command),
  });
}
