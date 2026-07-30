type Composition =
  typeof import("~/server/workflow/ui/pending-quotation-policy");

export async function queryPendingQuotationPolicy(
  ...args: Parameters<Composition["queryPendingQuotationPolicy"]>
) {
  "use server";
  const { queryPendingQuotationPolicy: execute } =
    await import("~/server/workflow/ui/pending-quotation-policy");
  return execute(...args);
}

export async function savePendingQuotationPolicy(
  ...args: Parameters<Composition["savePendingQuotationPolicy"]>
) {
  "use server";
  const { savePendingQuotationPolicy: execute } =
    await import("~/server/workflow/ui/pending-quotation-policy");
  return execute(...args);
}
