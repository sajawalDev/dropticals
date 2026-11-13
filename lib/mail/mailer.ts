import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { CONFIG } from '@/lib/config';

/* =========================================================
   Sending email over SMTP with nodemailer.

   SMTP_ADMIN  the shop's mailbox: it sends every email and
               receives the "new order" and "new message"
               notifications
   SMTP_PASS   its password (for Gmail, an App Password)

   Gmail is used unless SMTP_HOST (and optionally SMTP_PORT)
   say otherwise. Sending never throws: a failed email is
   logged and reported as false, so an order still goes through.
   ========================================================= */

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

let transport: Transporter | null = null;

export const adminAddress = () => (process.env.SMTP_ADMIN || '').trim();
export const hasMailer = () => !!(adminAddress() && process.env.SMTP_PASS);

function getTransport(): Transporter | null {
  if (transport) return transport;
  const user = adminAddress(), pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT) || 465;
  const timeouts = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };
  transport = host
    ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, ...timeouts })
    : nodemailer.createTransport({ service: 'gmail', auth: { user, pass }, ...timeouts });
  return transport;
}

/** Sends one email. Returns whether it was accepted by the mail server. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const t = getTransport();
  if (!t) {
    console.warn('[mail] SMTP_ADMIN or SMTP_PASS is not set; not sending:', mail.subject);
    return false;
  }
  if (!mail.to) return false;
  try {
    await t.sendMail({
      from: { name: CONFIG.brand, address: adminAddress() },
      to: mail.to,
      replyTo: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return true;
  } catch (e) {
    console.error('[mail] sending failed:', mail.subject, e instanceof Error ? e.message : e);
    return false;
  }
}
