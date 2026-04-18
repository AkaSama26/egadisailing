-- Composite index for cron balance-reminders query: status=CONFIRMED + startDate range
CREATE INDEX IF NOT EXISTS "Booking_status_startDate_idx" ON "Booking"("status", "startDate");

-- DirectBooking index for cron balance-reminders filter: paymentSchedule + balanceReminderSentAt NULL + balancePaidAt NULL
CREATE INDEX IF NOT EXISTS "DirectBooking_paymentSchedule_balanceReminderSentAt_balancePaidAt_idx"
    ON "DirectBooking"("paymentSchedule", "balanceReminderSentAt", "balancePaidAt");
