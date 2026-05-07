import { sendEmail } from "@/lib/email/brevo";
import { otpEmailTemplate } from "@/lib/email/templates/otp";

export async function sendOtpEmail(
  email: string,
  code: string,
  locale?: string | null,
): Promise<void> {
  const { subject, html, text } = otpEmailTemplate(code, locale);
  await sendEmail({ to: email, subject, htmlContent: html, textContent: text });
}
