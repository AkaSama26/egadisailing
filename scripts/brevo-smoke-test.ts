import "dotenv/config";
import { env } from "../src/lib/env";
import { sendEmailWithResult } from "../src/lib/email/brevo";

const recipient = process.argv[2] ?? process.env.BREVO_TEST_TO;

if (!recipient) {
  console.error("Usage: EMAIL_DELIVERY_MODE=brevo BREVO_TEST_TO=you@example.com npm run brevo:smoke");
  console.error("Or:    EMAIL_DELIVERY_MODE=brevo npm run brevo:smoke -- you@example.com");
  process.exit(1);
}

async function main() {
  const startedAt = new Date();
  const result = await sendEmailWithResult({
    to: recipient,
    subject: `Egadisailing Brevo smoke test - ${startedAt.toISOString()}`,
    htmlContent: `
      <p>Brevo smoke test Egadisailing.</p>
      <p><strong>Mode:</strong> ${env.EMAIL_DELIVERY_MODE}</p>
      <p><strong>Sender:</strong> ${env.BREVO_SENDER_NAME} &lt;${env.BREVO_SENDER_EMAIL}&gt;</p>
      <p><strong>Timestamp:</strong> ${startedAt.toISOString()}</p>
    `,
    textContent: `Brevo smoke test Egadisailing\nMode: ${env.EMAIL_DELIVERY_MODE}\nSender: ${env.BREVO_SENDER_EMAIL}\nTimestamp: ${startedAt.toISOString()}`,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
