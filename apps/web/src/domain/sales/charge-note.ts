import type { ChargeNote } from "./types";

export function createChargeNote(
  contactId: number,
  userId: number,
): Omit<ChargeNote, "id"> {
  const now = Date.now();
  return {
    contactId,
    userId,
    status: "Draft",
    execCodeReal: null,
    execCodeTdp: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateChargeNote(
  note: ChargeNote,
  updates: Partial<Pick<ChargeNote, "execCodeReal" | "execCodeTdp">>,
): ChargeNote {
  return {
    ...note,
    ...updates,
    updatedAt: Date.now(),
  };
}
