import nodemailer from 'nodemailer';
import { getAuthEnv } from './auth-env';

type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const authEnv = getAuthEnv();
  if (!authEnv.mailFrom || !authEnv.smtpHost || !authEnv.smtpPort || !authEnv.smtpUser || !authEnv.smtpPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: authEnv.smtpHost,
    port: authEnv.smtpPort,
    secure: authEnv.smtpSecure,
    auth: {
      user: authEnv.smtpUser,
      pass: authEnv.smtpPass
    }
  });

  return transporter;
}

export async function sendMail(message: MailMessage) {
  const authEnv = getAuthEnv();
  const mailer = getTransporter();

  if (mailer && authEnv.mailFrom) {
    await mailer.sendMail({
      from: authEnv.mailFrom,
      to: message.to,
      subject: message.subject,
      text: message.text
    });
    return;
  }

  const preview = [
    '[mail stub]',
    `to=${message.to}`,
    `subject=${message.subject}`,
    message.text
  ].join('\n');

  console.info(preview);
}
