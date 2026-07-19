import * as Sentry from "@sentry/nextjs";

const fullSha = /^[0-9a-f]{40}$/;
const releaseValues = [
  process.env.GIT_SHA,
  process.env.NEXT_DEPLOYMENT_ID,
  process.env.DEPLOYMENT_VERSION,
  process.env.SENTRY_RELEASE,
];

if (!process.env.SENTRY_DSN) {
  throw new Error("SENTRY_DSN is required");
}
if (
  releaseValues.some((value) => !value || !fullSha.test(value)) ||
  new Set(releaseValues).size !== 1
) {
  throw new Error("image release identity is missing or inconsistent");
}

const release = releaseValues[0];
const environment = process.env.SENTRY_ENVIRONMENT || "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment,
  release,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

const eventId = Sentry.captureMessage("Egadisailing production release smoke test", {
  level: "info",
  tags: {
    smoke_test: "release",
    runtime: "node",
  },
});
const flushed = await Sentry.flush(10_000);
if (!flushed) throw new Error("Sentry did not flush the test event within 10 seconds");

process.stdout.write(
  `${JSON.stringify({ eventId, release, environment, flushed: true })}\n`,
);
