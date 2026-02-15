import type { Repositories } from "~/server/shared/registry";
import { createAuditService } from "~/server/shared/audit";
import { canTransition } from "~/server/sales/domain";
import { Ok, Err, type Result } from "~/server/shared/result";
import { config } from "~/lib/config";

export function createSalesWorkflowService(repos: Repositories) {
  const audit = createAuditService(repos);

  return {
    async createDraft(
      contactId: number,
      userId: number,
    ): Promise<Result<number, string>> {
      const id = await repos.chargeNotes.create(contactId, userId);
      await audit.log(userId, "charge_note_created", "charge_note", id);
      return Ok(id);
    },

    async submit(
      noteId: number,
      userId: number,
    ): Promise<Result<void, string>> {
      const note = await repos.chargeNotes.findById(noteId);
      if (!note) return Err("Charge note not found");
      if (note.user_id !== userId) return Err("Not your charge note");
      if (!canTransition(note.status, "pending_review")) {
        return Err(`Cannot submit from status: ${note.status}`);
      }
      const itemCount = await repos.chargeNoteItems.countByChargeNote(noteId);
      if (itemCount < 1) {
        return Err("At least one product item is required before submission");
      }

      const documentCount = await repos.documents.countByChargeNote(noteId);
      if (documentCount < 1) {
        return Err("At least one document is required before submission");
      }

      const activeLock =
        await repos.inventory.findActiveLockByChargeNote(noteId);
      if (!activeLock) {
        return Err("An active inventory lock is required before submission");
      }

      await repos.chargeNotes.updateStatus(noteId, "pending_review");
      await repos.inventory.updateLockExpiry(
        activeLock.id,
        Date.now() + config.leadAssignment.ttlHours * 60 * 60 * 1000,
      );
      if (note.status === "rejected") {
        const unresolved =
          await repos.rejectionLogs.findUnresolvedByChargeNote(noteId);
        await Promise.all(
          unresolved.map((rejection) =>
            repos.rejectionLogs.markResolved(rejection.id),
          ),
        );
      }
      await audit.log(userId, "charge_note_submitted", "charge_note", noteId, {
        from: note.status,
        to: "pending_review",
      });
      return Ok(undefined);
    },

    async approve(
      noteId: number,
      reviewerId: number,
      reviewerBranchId: number,
      bypassBranchScope: boolean,
    ): Promise<Result<void, string>> {
      const note = await repos.chargeNotes.findByIdWithOwner(noteId);
      if (!note) return Err("Charge note not found");
      if (!bypassBranchScope && note.owner_branch_id !== reviewerBranchId) {
        return Err("Cannot review a sale from another branch");
      }
      if (!canTransition(note.status, "approved")) {
        return Err(`Cannot approve from status: ${note.status}`);
      }
      const activeLock = await repos.inventory.findAnyLockByChargeNote(noteId);
      if (!activeLock) {
        return Err("Cannot approve without reserved inventory lock");
      }

      await repos.chargeNotes.updateStatus(noteId, "approved");
      await repos.inventory.markSold(activeLock.inventory_item_id);
      await repos.inventory.deleteByChargeNote(noteId);
      await audit.log(
        reviewerId,
        "charge_note_approved",
        "charge_note",
        noteId,
        { from: note.status, to: "approved" },
      );
      return Ok(undefined);
    },

    async reject(
      noteId: number,
      reviewerId: number,
      reviewerBranchId: number,
      bypassBranchScope: boolean,
      rejections: Array<{ field_id: string; reviewer_note: string | null }>,
    ): Promise<Result<void, string>> {
      const note = await repos.chargeNotes.findByIdWithOwner(noteId);
      if (!note) return Err("Charge note not found");
      if (!bypassBranchScope && note.owner_branch_id !== reviewerBranchId) {
        return Err("Cannot review a sale from another branch");
      }
      if (!canTransition(note.status, "rejected")) {
        return Err(`Cannot reject from status: ${note.status}`);
      }

      await repos.chargeNotes.updateStatus(noteId, "rejected");

      const now = Date.now();
      await Promise.all(
        rejections.map((r) =>
          repos.rejectionLogs.create({
            charge_note_id: noteId,
            reviewer_id: reviewerId,
            field_id: r.field_id,
            reviewer_note: r.reviewer_note,
            is_resolved: 0,
            created_at: now,
          }),
        ),
      );

      await audit.log(
        reviewerId,
        "charge_note_rejected",
        "charge_note",
        noteId,
        {
          from: note.status,
          to: "rejected",
          fields: rejections.map((r) => r.field_id),
        },
      );
      return Ok(undefined);
    },
  };
}
