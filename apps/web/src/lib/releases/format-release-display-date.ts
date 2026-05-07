export function formatReleaseDisplayDate(date: string | undefined): string {
  if (!date) return "TBD";

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "TBD";

  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
