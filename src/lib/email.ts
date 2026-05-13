import nodemailer from "nodemailer";

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/verify-email?token=${token}`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#111827;color:#f9fafb;padding:32px;border-radius:12px;">
      <h1 style="font-size:24px;margin-bottom:8px;">Verify your Aura Trade account</h1>
      <p style="color:#9ca3af;margin-bottom:24px;">Click the button below to verify your email address. This link expires in 24 hours.</p>
      <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>`;

  const transport = createTransport();
  if (!transport) {
    console.log(`[DEV] Verify email: ${url}`);
    return;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Aura Trade <noreply@auratrade.com>",
    to,
    subject: "Verify your Aura Trade email",
    html
  });
}
