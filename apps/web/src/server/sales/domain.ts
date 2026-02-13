type ChargeNoteStatus = "draft" | "pending_review" | "approved" | "rejected";

const VALID_TRANSITIONS: Record<ChargeNoteStatus, ChargeNoteStatus[]> = {
    draft: ["pending_review"],
    pending_review: ["approved", "rejected"],
    rejected: ["pending_review"],
    approved: [],
};

export function canTransition(from: ChargeNoteStatus, to: ChargeNoteStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isDraft(status: ChargeNoteStatus): boolean {
    return status === "draft";
}

export function isRejected(status: ChargeNoteStatus): boolean {
    return status === "rejected";
}
