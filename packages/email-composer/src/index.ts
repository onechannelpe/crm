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
  invite(params: InviteEmailParams): EmailMessage;
  passwordReset(params: PasswordResetEmailParams): EmailMessage;
  accountExpiring(params: AccountExpiringEmailParams): EmailMessage;
  campaign(params: CampaignEmailParams): EmailMessage;
}

export function createEmailComposer(): EmailComposer {
  return {
    invite(params) {
      const message = renderInviteEmail(params);
      return {
        subject: "Activa tu acceso al CRM",
        html: message.html,
        text: message.text,
      };
    },
    passwordReset(params) {
      const message = renderPasswordResetEmail(params);
      return {
        subject: "Restablecer contraseña",
        html: message.html,
        text: message.text,
      };
    },
    accountExpiring(params) {
      const message = renderAccountExpiringEmail(params);
      return {
        subject: "Tu cuenta en One Channel vence pronto",
        html: message.html,
        text: message.text,
      };
    },
    campaign(params) {
      const message = renderCampaignEmail(params);
      return {
        subject: params.title?.trim() || "Notificación",
        html: message.html,
        text: message.text,
      };
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
