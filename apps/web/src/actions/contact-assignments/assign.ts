"use server";

import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

import { parseAssignContactsCommand } from "./input";

export async function assignCurrentUserContacts() {
  return runAction({
    actionName: "contact_assignments.assign_current_user",
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
