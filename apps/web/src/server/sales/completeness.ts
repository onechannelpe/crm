interface CompletenessInput {
  ruc: string | null;
  companyName: string | null;
  contactName: string | null;
  dni: string | null;
  phones: string[];
  engineMatchId: string | null;
}

function present(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

export function computeClientCompletenessScore(
  input: CompletenessInput,
): number {
  let score = 0;
  if (present(input.ruc)) score += 20;
  if (present(input.companyName)) score += 20;
  if (present(input.contactName)) score += 20;
  if (present(input.dni)) score += 20;
  if (input.phones.some((phone) => phone.trim().length > 0)) score += 10;
  if (present(input.engineMatchId)) score += 10;
  return score;
}
