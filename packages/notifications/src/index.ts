import nodemailer from "nodemailer";

export interface LoginAlertPayload {
  toEmail: string;
  userName: string;
  role: string;
  ipAddress: string;
  method: string;
  occurredAt: number;
}

interface NotificationsConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}

function hasSmtpConfig(config: NotificationsConfig): boolean {
  return Boolean(
    config.smtpHost &&
      config.smtpPort &&
      config.smtpUser &&
      config.smtpPass &&
      config.smtpFrom,
  );
}

export function createNotificationService(config: NotificationsConfig) {
  return {
    async sendPrivilegedLoginAlert(payload: LoginAlertPayload): Promise<void> {
      if (!hasSmtpConfig(config)) {
        return;
      }

      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      const occurredAt = new Date(payload.occurredAt).toISOString();
      const subject = `Security alert: privileged login (${payload.role})`;
      const text = [
        `User: ${payload.userName} <${payload.toEmail}>`,
        `Role: ${payload.role}`,
        `Method: ${payload.method}`,
        `IP: ${payload.ipAddress}`,
        `At: ${occurredAt}`,
      ].join("\n");

      await transporter.sendMail({
        from: config.smtpFrom,
        to: payload.toEmail,
        subject,
        text,
      });
    },
  };
}
