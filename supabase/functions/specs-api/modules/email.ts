import { assertString } from '../http.ts';
import type { ActionResult, AuthenticatedUser, JsonMap } from '../types.ts';

type EmailPayload = {
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  subject: string;
  body: string;
  html?: boolean;
  fromName?: string;
};

function providerConfig() {
  const provider = (Deno.env.get('EMAIL_PROVIDER') || 'resend').toLowerCase();
  const keyName = provider === 'brevo'
    ? 'BREVO_API_KEY'
    : provider === 'sendgrid'
      ? 'SENDGRID_API_KEY'
      : 'RESEND_API_KEY';
  const key = Deno.env.get(keyName);
  const from = Deno.env.get('EMAIL_FROM');
  if (!['brevo', 'resend', 'sendgrid'].includes(provider)) {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
  if (!key || !from) throw new Error(`${keyName} and EMAIL_FROM are required`);
  return { provider, key, from };
}

async function sendHttpEmail(payload: EmailPayload, to: string): Promise<JsonMap> {
  const config = providerConfig();
  const fromName = payload.fromName || Deno.env.get('EMAIL_FROM_NAME') || 'SPECS Organization';
  const from = `${fromName} <${config.from}>`;

  const response = config.provider === 'sendgrid'
    ? await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.from, name: fromName },
        subject: payload.subject,
        content: [{ type: payload.html ? 'text/html' : 'text/plain', value: payload.body }],
      }),
    })
    : config.provider === 'brevo'
      ? await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': config.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { email: config.from, name: fromName },
          to: [{ email: to }],
          subject: payload.subject,
          ...(payload.html ? { htmlContent: payload.body } : { textContent: payload.body }),
        }),
      })
      : await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject: payload.subject, ...(payload.html ? { html: payload.body } : { text: payload.body }) }),
      });
  if (!response.ok) throw new Error(`Email provider ${response.status}: ${await response.text()}`);
  return await response.json().catch(() => ({})) as JsonMap;
}

export async function emailAction(_user: AuthenticatedUser, body: JsonMap): Promise<ActionResult> {
  if (body.action === 'send_announcement') throw new Error('Bulk email announcements are disabled. Use publish_notification for in-app announcements.');
  const payload = (body.payload && typeof body.payload === 'object' ? body.payload : body) as EmailPayload;
  const subject = assertString(payload.subject, 'subject');
  const message = assertString(payload.body, 'body');
  if (payload.cc !== undefined || payload.bcc !== undefined) throw new Error('cc and bcc are not supported; send one personal email at a time');
  if (Array.isArray(payload.to)) throw new Error('Email accepts exactly one recipient');
  const to = assertString(payload.to, 'to').trim();
  if (!to.includes('@') || to.includes(',') || to.includes(';')) throw new Error('Email accepts exactly one valid recipient');
  const providerResponse = await sendHttpEmail({ ...payload, subject, body: message }, to);
  return { success: true, message: 'Personal email sent successfully', providerResponse };
}
