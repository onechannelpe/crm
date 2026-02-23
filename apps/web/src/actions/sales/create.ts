"use server";

import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { createAssignment } from "~/server/leads/domain-assignment";
import { createAuditService } from "~/server/shared/audit";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import { salesService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import type { CreateSaleResult, ManualSaleInput } from "./types";

export async function createSale(contactId: number): Promise<CreateSaleResult> {
  const safeContactId = assertPositiveInt(contactId, "contactId");
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales.create",
    actor,
    input: { contactId: safeContactId },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      const hasLead = await repos.leadAssignments.hasActiveForContact(
        session.userId,
        safeContactId,
      );
      if (!hasLead) {
        throw new Error(
          "You can only create sales from your active assigned leads",
        );
      }

      const result = await salesService.createDraft(
        safeContactId,
        session.userId,
      );

      if (isErr(result)) throw new Error(result.error);
      return { id: result.value };
    },
  });
}

export async function createManualSale(
  input: ManualSaleInput,
): Promise<CreateSaleResult> {
  const safeRuc = assertNonEmptyString(input.ruc, "ruc");
  const safeOrgName = assertNonEmptyString(input.orgName, "orgName");
  const safeDni = assertNonEmptyString(input.dni, "dni");
  const safeContactName = assertNonEmptyString(
    input.contactName,
    "contactName",
  );
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales.create_manual",
    actor,
    input: { ruc: safeRuc, dni: safeDni },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;

      return runInRepositoryTransaction(async (txRepos) => {
        const org = await txRepos.organizations.findOrCreate(
          safeRuc,
          safeOrgName,
        );
        const contact = await txRepos.contacts.findOrCreate(
          org.id,
          safeDni,
          safeContactName,
          input.phoneE164,
        );

        const hasLead = await txRepos.leadAssignments.hasActiveForContact(
          session.userId,
          contact.id,
        );
        if (!hasLead) {
          await txRepos.leadAssignments.create(
            createAssignment(session.userId, contact.id),
          );
        }

        const noteId = await txRepos.chargeNotes.create(
          contact.id,
          session.userId,
        );

        await createAuditService(txRepos).log(
          session.userId,
          "charge_note_created",
          "charge_note",
          noteId,
        );

        return { id: noteId };
      });
    },
  });
}
