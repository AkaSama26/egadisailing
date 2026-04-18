import { sendEmail } from "@/lib/email/brevo";
import { otpEmailTemplate } from "@/lib/email/templates/otp";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { subject, html, text } = otpEmailTemplate(code);
  await sendEmail({ to: email, subject, htmlContent: html, textContent: text });
}
