import type { UsersTable } from "~/lib/db/types";

type PersonName = Pick<
  UsersTable,
  "names" | "first_surname" | "second_surname"
>;

export type TimelinePersonName = {
  names: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
};

function toPersonName(input: TimelinePersonName): PersonName | null {
  if (
    input.names === null &&
    input.firstSurname === null &&
    input.secondSurname === null
  ) {
    return null;
  }

  return {
    names: input.names ?? "",
    first_surname: input.firstSurname ?? "",
    second_surname: input.secondSurname ?? "",
  };
}

export function formatTimelineActorName(
  input: TimelinePersonName,
  revealFull: boolean,
) {
  const actor = toPersonName(input);
  if (!actor) {
    return "Sistema";
  }

  const names = actor.names.trim();
  const firstName = names.split(/\s+/)[0] ?? "";
  const firstSurname = actor.first_surname.trim();

  if (revealFull) {
    return [names, firstSurname, actor.second_surname.trim()]
      .filter((value) => value.length > 0)
      .join(" ");
  }

  return [firstName, firstSurname ? `${firstSurname[0]}.` : ""]
    .filter((value) => value.length > 0)
    .join(" ");
}
