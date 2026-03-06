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
