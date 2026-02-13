import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";
import { createUsersRepo } from "~/server/users/repos-users";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createLeadAssignmentsRepo } from "~/server/leads/repos";
import { createQuotaAllocationsRepo } from "~/server/quota/repos";
import { createChargeNotesRepo } from "~/server/sales/repos-charge-notes";
import { createChargeNoteItemsRepo } from "~/server/sales/repos-items";
import { createRejectionLogsRepo } from "~/server/sales/repos-rejections";
import { createInteractionLogsRepo } from "./repos-interaction-logs";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createInventoryRepo } from "~/server/inventory/repos";
import { createDocumentsRepo } from "~/server/sales/repos-documents";
import { createAuditLogsRepo } from "./repos-audit-logs";
import { createAgentStatusRepo } from "./repos-agent-status";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createBranchesRepo } from "~/server/users/repos-branches";
import { createSessionRepository } from "~/server/sessions/repos-sessions";

export function createRepositories(db: Kysely<Database>) {
    return {
        users: createUsersRepo(db),
        sessions: createSessionRepository(db),
        organizations: createOrganizationsRepo(db),
        contacts: createContactsRepo(db),
        leadAssignments: createLeadAssignmentsRepo(db),
        quotaAllocations: createQuotaAllocationsRepo(db),
        chargeNotes: createChargeNotesRepo(db),
        chargeNoteItems: createChargeNoteItemsRepo(db),
        rejectionLogs: createRejectionLogsRepo(db),
        interactionLogs: createInteractionLogsRepo(db),
        products: createProductsRepo(db),
        inventory: createInventoryRepo(db),
        documents: createDocumentsRepo(db),
        auditLogs: createAuditLogsRepo(db),
        agentStatus: createAgentStatusRepo(db),
        passkeys: createPasskeysRepo(db),
        branches: createBranchesRepo(db),
    };
}

export type Repositories = ReturnType<typeof createRepositories>;
