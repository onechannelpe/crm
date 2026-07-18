import type { DeliveryProvider, OutboundEmail } from "../../types";

// A fully composed email, handed to the sink instead of sent.
export interface LoggedMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Non-sending transport for dev and e2e: hands the composed message to the
// caller-supplied sink (typically a logger) instead of a provider. The sink is
// injected so this package depends on no logger of its own.
export function createLogProvider(
  record: (mail: LoggedMail) => void,
): DeliveryProvider<"email"> {
  return {
    id: "log",
    channel: "email",
    send(input: OutboundEmail) {
      record({
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return Promise.resolve({ providerMessageId: null });
    },
  };
}
