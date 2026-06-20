"use server";

import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";

import { parseAssignContactsCommand } from "./input";

export async function assignCurrentUserContacts() {
  return runAction({
    name: "contact_assignments.assign_current_user",
    access: { kind: "permission", permission: "lead:work" },
    execute: (ctx) => {
      const cmdResult = parseAssignContactsCommand(
        ctx.actor.userId,
        ctx.actor.branchId,
      );
      if (!cmdResult.ok) {
        return Promise.resolve(cmdResult);
      }

      return assignContacts(
        cmdResult.value,
        getServerRuntime().contactAssignments,
      );
    },
  });
}
