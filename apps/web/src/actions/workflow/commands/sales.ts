"use server";

import {
  type AddVenueAccountsInput,
  type CreateVenueInput,
} from "~/contracts/workflow/inputs";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function requestVenueCreation(input: CreateVenueInput) {
  return runAction({
    actionName: "workflow.create_venue",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.createVenue({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        ...input,
      }),
  });
}

export async function requestVenueAccountsAddition(
  input: AddVenueAccountsInput,
) {
  return runAction({
    actionName: "workflow.add_venue_accounts",
    access: { kind: "auth" },
    input: { leadId: input.leadId, venueId: input.venueId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.addVenueAccounts({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        ...input,
      }),
  });
}
