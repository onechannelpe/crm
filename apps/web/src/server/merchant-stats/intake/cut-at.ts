// The dealer names every export with the cut it was taken at:
//
//   planning-report__dealer-infinity-pay_03_07_26_C2-05_58.xlsx
//                                        dd mm yy C#  hh mm
//
// Reading it here beats inferring the cut from the data. Inference used to take
// max(ultima_trx) and cap it at today, which read the clock inside the decoder
// (so the same bytes decoded differently on different days) and quietly fell
// through to "today" whenever the data disagreed.
//
// The C# is the cut number: the dealer exports more than once a day, which is
// why cut_at carries a time and merchant_reports.cut_at is a timestamp.
const CUT_PATTERN = /_(\d{2})_(\d{2})_(\d{2})_C\d+-(\d{2})_(\d{2})(?:\D|$)/;

// The filename carries no timezone, so the components are read as written and
// stored as UTC. Only ordering between cuts is load-bearing, and displaying the
// same wall-clock the dealer named the file with is the least surprising.
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
