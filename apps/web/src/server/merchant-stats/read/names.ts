// The one owner of "what do we call this user". Every read surface that joins
// users for a seller name goes through here; four copies of this three-line
// join-and-trim is how they drift.
export function displayName(row: {
  names: string | null;
  first_surname: string | null;
}): string | null {
  const full = [row.names, row.first_surname].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : null;
}
