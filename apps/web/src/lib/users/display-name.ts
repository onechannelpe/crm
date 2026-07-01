type SnakeCaseName = {
  names: string;
  first_surname: string;
  second_surname: string;
};
type CamelCaseName = {
  names: string;
  firstSurname: string;
  secondSurname: string;
};

export function shortName(user: SnakeCaseName | CamelCaseName): string {
  return "first_surname" in user
    ? `${user.names} ${user.first_surname}`
    : `${user.names} ${user.firstSurname}`;
}

export function longName(user: SnakeCaseName | CamelCaseName): string {
  return "first_surname" in user
    ? `${user.names} ${user.first_surname} ${user.second_surname}`
    : `${user.names} ${user.firstSurname} ${user.secondSurname}`;
}

// A person (unlike a user) may be known only by a single unstructured display
// string, so its surnames are nullable. Compose whatever parts exist.
export function personDisplayName(person: {
  names: string;
  first_surname: string | null;
  second_surname: string | null;
}): string {
  return [person.names, person.first_surname, person.second_surname]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" ");
}
