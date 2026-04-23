import type { LeadHistoryPerson } from "~/server/workflow/domain/history";

export function formatTimelineActorName(
  actor: LeadHistoryPerson | null,
  revealFull: boolean,
) {
  if (!actor) {
    return "Sistema";
  }

  const names = (actor.names ?? "").trim();
  const firstName = names.split(/\s+/)[0] ?? "";
  const firstSurname = (actor.firstSurname ?? "").trim();

  if (revealFull) {
    return [names, firstSurname, (actor.secondSurname ?? "").trim()]
      .filter((value) => value.length > 0)
      .join(" ");
  }

  return [firstName, firstSurname ? `${firstSurname[0]}.` : ""]
    .filter((value) => value.length > 0)
    .join(" ");
}
