import type { DeliveryProvider, OutboundEmail } from "../../types";

// A fully composed email, recorded instead of sent.
export interface LoggedMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Prefix on the single stdout line the log transport writes per email. The e2e
// harness greps its server's stdout for this marker to recover messages it
// cannot read any other way, e.g. an invite link the database only stores
// hashed. Deliberately distinctive so it never collides with real log output.
export const LOGGED_MAIL_MARKER = "crm.mail.logged";

function isLoggedMail(value: unknown): value is LoggedMail {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LoggedMail).to === "string" &&
    typeof (value as LoggedMail).subject === "string" &&
    typeof (value as LoggedMail).text === "string" &&
    typeof (value as LoggedMail).html === "string"
  );
}

// Read side of the stdout contract: returns the mail a log line carries, or null
// for any line that is not a marked, well-formed record.
export function parseLoggedMail(line: string): LoggedMail | null {
  const at = line.indexOf(LOGGED_MAIL_MARKER);
  if (at === -1) return null;
  try {
    const parsed: unknown = JSON.parse(
      line.slice(at + LOGGED_MAIL_MARKER.length),
    );
    return isLoggedMail(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Selected by routing email to `log` (NOTIFICATION_ROUTES=email:log). Only the
// network egress is replaced; composing and routing the message still run for
// real.
export function createLogProvider(): DeliveryProvider<"email"> {
  return {
    id: "log",
    channel: "email",
    send(input: OutboundEmail) {
      const record: LoggedMail = {
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      };
      console.log(`${LOGGED_MAIL_MARKER} ${JSON.stringify(record)}`);
      return Promise.resolve({ providerMessageId: null });
    },
  };
}
