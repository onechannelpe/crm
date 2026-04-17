import {
  renderAccountExpiringEmail,
  type AccountExpiringEmailParams,
} from "./templates/compiled/account-expiring.js";
import {
  renderCampaignEmail,
  type CampaignEmailParams,
} from "./templates/compiled/campaign.js";
import {
  renderInviteEmail,
  type InviteEmailParams,
} from "./templates/compiled/invite.js";
import {
  renderPasswordResetEmail,
  type PasswordResetEmailParams,
} from "./templates/compiled/password-reset.js";

export type EmailTemplateMap = {
  invite: InviteEmailParams;
  passwordReset: PasswordResetEmailParams;
  accountExpiring: AccountExpiringEmailParams;
  campaign: CampaignEmailParams;
};

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

export interface EmailComposer {
  compose<K extends keyof EmailTemplateMap>(
    template: K,
    params: EmailTemplateMap[K],
  ): EmailMessage;
}

export function createEmailComposer(): EmailComposer {
  return {
    compose(template, params) {
      switch (template) {
        case "invite": {
          const message = renderInviteEmail(params as InviteEmailParams);
          return {
            subject: "Activa tu acceso al CRM",
            html: message.html,
            text: message.text,
          };
        }
        case "passwordReset": {
          const message = renderPasswordResetEmail(
            params as PasswordResetEmailParams,
          );
          return {
            subject: "Restablecer contraseña",
            html: message.html,
            text: message.text,
          };
        }
        case "accountExpiring": {
          const message = renderAccountExpiringEmail(
            params as AccountExpiringEmailParams,
          );
          return {
            subject: "Tu cuenta en One Channel vence pronto",
            html: message.html,
            text: message.text,
          };
        }
        case "campaign": {
          const campaign = params as CampaignEmailParams;
          const message = renderCampaignEmail(campaign);
          return {
            subject: campaign.title?.trim() || "Notificación",
            html: message.html,
            text: message.text,
          };
        }
        default:
          template satisfies never;
          throw new Error("Unsupported email template");
      }
    },
  };
}

export {
  renderInviteEmail,
  renderCampaignEmail,
  renderAccountExpiringEmail,
  renderPasswordResetEmail,
};

export type {
  InviteEmailParams,
  CampaignEmailParams,
  AccountExpiringEmailParams,
  PasswordResetEmailParams,
};
