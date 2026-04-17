import type {
  EmailComposer,
  InviteEmailParams,
  PasswordResetEmailParams,
  AccountExpiringEmailParams,
  CampaignEmailParams,
} from "@crm/email-composer";
import type {
  DeliveryError,
  MessageChannels,
  Result,
} from "@crm/message-channels";

export interface MessagingGateway {
  sendInviteEmail(input: {
    to: string;
    params: InviteEmailParams;
  }): Promise<Result<void, DeliveryError>>;
  sendPasswordResetEmail(input: {
    to: string;
    params: PasswordResetEmailParams;
  }): Promise<Result<void, DeliveryError>>;
  sendAccountExpiringEmail(input: {
    to: string;
    params: AccountExpiringEmailParams;
  }): Promise<Result<void, DeliveryError>>;
  sendCampaignEmail(input: {
    to: string;
    params: CampaignEmailParams;
  }): Promise<Result<void, DeliveryError>>;
  sendWhatsAppText(input: {
    to: string;
    body: string;
  }): Promise<Result<void, DeliveryError>>;
}

export function createMessagingGateway(deps: {
  channels: MessageChannels;
  composer: EmailComposer;
}): MessagingGateway {
  return {
    sendInviteEmail(input) {
      const email = deps.composer.compose("invite", input.params);
      return deps.channels.sendEmail({
        to: input.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    },

    sendPasswordResetEmail(input) {
      const email = deps.composer.compose("passwordReset", input.params);
      return deps.channels.sendEmail({
        to: input.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    },

    sendAccountExpiringEmail(input) {
      const email = deps.composer.compose("accountExpiring", input.params);
      return deps.channels.sendEmail({
        to: input.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    },

    sendCampaignEmail(input) {
      const email = deps.composer.compose("campaign", input.params);
      return deps.channels.sendEmail({
        to: input.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    },

    sendWhatsAppText(input) {
      return deps.channels.sendWhatsAppText({
        to: input.to,
        body: input.body,
      });
    },
  };
}
