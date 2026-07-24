// Dealer filenames encode the snapshot cut:
//
//   planning-report__dealer-infinity-pay_03_07_26_C2-05_58.xlsx
//                                        dd mm yy C#  hh mm
//
// C# distinguishes multiple cuts on one day. The filename is the source of
// truth because row timestamps describe individual sales, not the export.
const CUT_PATTERN = /_(\d{2})_(\d{2})_(\d{2})_C(\d+)-(\d{2})_(\d{2})(?:\D|$)/;
const INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

// Dealer filenames omit a timezone. Store their wall-clock components as UTC;
// only cut ordering is load-bearing.
export function cutAtFromFilename(filename: string): Date | null {
  const match = CUT_PATTERN.exec(filename);
  if (!match) return null;

  const [, dd, mm, yy, rawSequence, hh, minute] = match;

  return cutAtFromParts({
    year: 2000 + Number(yy),
    month: Number(mm),
    day: Number(dd),
    hour: Number(hh),
    minute: Number(minute),
    sequence: Number(rawSequence),
  });
}

export function cutAtFromInput(value: string): Date | null {
  const match = INPUT_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  return cutAtFromParts({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    sequence: 0,
  });
}

function cutAtFromParts(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  sequence: number;
}): Date | null {
  const { year, month, day, hour, minute, sequence } = parts;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 999) {
    return null;
  }

  // The dealer timestamp is an ordering key, not a real-world instant. UTC
  // stores its wall-clock fields unchanged, and milliseconds preserve C# order.
  const cutAt = new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0, sequence),
  );

  // Date.UTC rolls a bad day over into the next month (Feb 31 -> Mar 3) rather
  // than failing, so confirm the components survived the round trip.
  if (
    cutAt.getUTCFullYear() !== year ||
    cutAt.getUTCMonth() !== month - 1 ||
    cutAt.getUTCDate() !== day
  ) {
    return null;
  }

  return cutAt;
}
