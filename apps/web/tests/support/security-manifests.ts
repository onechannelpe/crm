export const SALES_ERROR_MANIFEST = {
  submitMissingAddresses: "At least one address is required before submit",
  submitMissingProducts: "At least one product is required before submit",
  crossBranchConfirm: "Cannot confirm a sales record from another branch",
  emptyRejectionReason: "Rejection reason is required",
} as const;

export const QUOTA_ERROR_MANIFEST = {
  duplicateDailyAllocation: "Quota already allocated for this date",
  exhausted2of2: "Quota exhausted: 2/2 used.",
} as const;
