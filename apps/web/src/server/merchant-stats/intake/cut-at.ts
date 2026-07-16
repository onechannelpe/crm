// Dealer filenames encode the snapshot cut:
//
//   planning-report__dealer-infinity-pay_03_07_26_C2-05_58.xlsx
//                                        dd mm yy C#  hh mm
//
// C# distinguishes multiple cuts on one day. The filename is the source of
// truth because row timestamps describe individual sales, not the export.
const CUT_PATTERN = /_(\d{2})_(\d{2})_(\d{2})_C\d+-(\d{2})_(\d{2})(?:\D|$)/;

// Dealer filenames omit a timezone. Store their wall-clock components as UTC;
// only cut ordering is load-bearing.
export function cutAtFromFilename(filename: string): Date | null {
  const match = CUT_PATTERN.exec(filename);
  if (!match) return null;

  const [, dd, mm, yy, hh, minute] = match;
  const year = 2000 + Number(yy);
  const month = Number(mm);
  const day = Number(dd);
  const hour = Number(hh);
  const minutes = Number(minute);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minutes > 59) return null;

  const cutAt = new Date(Date.UTC(year, month - 1, day, hour, minutes, 0, 0));

  // Date.UTC rolls a bad day over into the next month (Feb 31 -> Mar 3) rather
  // than failing, so confirm the components survived the round trip.
  if (cutAt.getUTCMonth() !== month - 1 || cutAt.getUTCDate() !== day) {
    return null;
  }

  return cutAt;
}
