-- Round 12 A1 — alert fatigue dedup per WEATHER_ALERT notifications.
-- weatherLastAlertedRisk + weatherLastAlertedAt consentono al cron
-- weather-check di skippare re-alert sullo stesso risk nelle ultime 24h.

ALTER TABLE "Booking" ADD COLUMN "weatherLastAlertedRisk" TEXT;
ALTER TABLE "Booking" ADD COLUMN "weatherLastAlertedAt" TIMESTAMP(3);
