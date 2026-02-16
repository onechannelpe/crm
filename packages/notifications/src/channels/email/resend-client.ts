import { Resend } from "resend";

interface ResendMailInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendWithResend(
  apiKey: string,
  input: ResendMailInput,
): Promise<void> {
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
