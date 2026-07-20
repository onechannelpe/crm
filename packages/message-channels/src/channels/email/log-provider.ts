import type { DeliveryProvider, OutboundEmail } from "../../types";

export interface LoggedMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function createLogProvider(
  record: (mail: LoggedMail) => void,
): DeliveryProvider<"email"> {
  return {
    id: "log",
    channel: "email",

    async send(input: OutboundEmail) {
      record({
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      return { providerMessageId: null };
    },
  };
}
