import type { LeadCallOutcome, UsersTable } from "~/lib/db/types";

type PersonName = Pick<
  UsersTable,
  "names" | "first_surname" | "second_surname"
>;

export function formatLeadActorName(
  actor: PersonName | null | undefined,
  revealFull: boolean,
) {
  if (!actor) {
    return "Sistema";
  }

  const firstName = actor.names.trim().split(/\s+/)[0] ?? "";
  const firstSurname = actor.first_surname.trim();
  const maskedSurname = firstSurname ? `${firstSurname[0]}.` : "";

  if (revealFull) {
    return [actor.names.trim(), firstSurname, actor.second_surname.trim()]
      .filter((value) => value.length > 0)
      .join(" ");
  }

  return [firstName, maskedSurname]
    .filter((value) => value.length > 0)
    .join(" ");
}

export function describeLeadCallOutcome(outcome: LeadCallOutcome | null) {
  switch (outcome) {
    case "answered":
      return "Llamada contestada";
    case "no_answer":
      return "Sin respuesta";
    case "wrong_number":
      return "Número incorrecto";
    case "callback_requested":
      return "Pidió devolución";
    case "qualified":
      return "Cliente calificado";
    case "disqualified":
      return "Cliente descartado";
    default:
      return "Llamada registrada";
  }
}
