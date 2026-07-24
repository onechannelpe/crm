export type Clock = () => Date;

export function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

export function epochMilliseconds(date: Date): number {
  return date.getTime();
}

export function epochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function dateFromEpochMilliseconds(value: number): Date {
  return new Date(value);
}
