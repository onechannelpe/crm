"use server";

import * as api from "../api";
import { ChargeNote, RejectionLog } from "../../shared/types";
import { redirect } from "@solidjs/router";

/**
 * SalesService handles business logic for sales-related operations.
 * It abstracts the underlying API calls and provides a clean interface for the UI.
 */
export const SalesService = {
    /**
     * Loads a sale by its ID.
     * Centralizes type conversion and error handling.
     */
    async getSale(id: string | number): Promise<ChargeNote> {
        const numericId = typeof id === "string" ? Number(id) : id;
        if (isNaN(numericId)) {
            throw new Error(`Invalid sale ID: ${id}`);
        }
        return api.getChargeNote(numericId);
    },

    /**
     * Loads rejections for a specific sale.
     */
    async getRejections(id: string | number): Promise<RejectionLog[]> {
        const numericId = typeof id === "string" ? Number(id) : id;
        if (isNaN(numericId)) {
            throw new Error(`Invalid sale ID: ${id}`);
        }
        return api.getChargeNoteRejections(numericId);
    },

    /**
     * Resubmits a charge note for validation.
     * Handles the redirect logic as well.
     */
    async resubmitForValidation(id: string | number): Promise<never> {
        const numericId = typeof id === "string" ? Number(id) : id;
        if (isNaN(numericId)) {
            throw new Error(`Invalid sale ID: ${id}`);
        }

        await api.submitChargeNote(numericId);
        throw redirect("/search");
    },
};
