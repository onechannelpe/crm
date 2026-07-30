type Composition =
  typeof import("~/server/workflow/ui/rate-proposal-policy");

export async function queryRateProposalPolicy(
  ...args: Parameters<Composition["queryRateProposalPolicy"]>
) {
  "use server";
  const { queryRateProposalPolicy: execute } =
    await import("~/server/workflow/ui/rate-proposal-policy");
  return execute(...args);
}

export async function saveRateProposalPolicy(
  ...args: Parameters<Composition["saveRateProposalPolicy"]>
) {
  "use server";
  const { saveRateProposalPolicy: execute } =
    await import("~/server/workflow/ui/rate-proposal-policy");
  return execute(...args);
}
