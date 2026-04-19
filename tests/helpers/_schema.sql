-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PaymentSchedule" AS ENUM ('FULL', 'DEPOSIT_BALANCE');

-- CreateEnum
CREATE TYPE "DurationType" AS ENUM ('FULL_DAY', 'HALF_DAY_MORNING', 'HALF_DAY_AFTERNOON', 'WEEK');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BLOCKED', 'PARTIALLY_BOOKED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'BOKUN', 'BOATAROUND', 'SAMBOAT', 'CLICKANDBOAT', 'NAUTAL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'BALANCE', 'FULL', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'CASH', 'BANK_TRANSFER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ManualAlertStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "CrewRole" AS ENUM ('SKIPPER', 'CHEF', 'HOSTESS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "length" DOUBLE PRECISION,
    "year" INTEGER,
    "cabins" INTEGER,
    "engineHp" INTEGER,
    "amenities" JSONB NOT NULL,
    "images" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Boat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "durationType" "DurationType" NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "capacityMax" INTEGER NOT NULL,
    "minPaying" INTEGER,
    "defaultPaymentSchedule" "PaymentSchedule" NOT NULL DEFAULT 'FULL',
    "defaultDepositPercentage" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "bokunProductId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPeriod" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "pricePerPerson" DECIMAL(10,2) NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotDayRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateRangeStart" DATE NOT NULL,
    "dateRangeEnd" DATE NOT NULL,
    "weekdays" INTEGER[],
    "multiplier" DECIMAL(4,3) NOT NULL,
    "roundTo" INTEGER NOT NULL DEFAULT 10,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotDayRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotDayOverride" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "serviceId" TEXT,
    "multiplier" DECIMAL(4,3),
    "absolutePrice" DECIMAL(10,2),
    "roundTo" INTEGER NOT NULL DEFAULT 10,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotDayOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BokunPriceSync" (
    "id" TEXT NOT NULL,
    "hotDayRuleId" TEXT,
    "bokunExperienceId" TEXT NOT NULL,
    "bokunPriceOverrideId" TEXT,
    "date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BokunPriceSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoatAvailability" (
    "id" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "lockedByBookingId" TEXT,
    "lastSyncedSource" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoatAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelSyncStatus" (
    "channel" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "healthStatus" TEXT NOT NULL DEFAULT 'GREEN',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelSyncStatus_pkey" PRIMARY KEY ("channel")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "nationality" TEXT,
    "language" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "source" "BookingSource" NOT NULL,
    "externalRef" TEXT,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "numPeople" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weatherLastAlertedRisk" TEXT,
    "weatherLastAlertedAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectBooking" (
    "bookingId" TEXT NOT NULL,
    "paymentSchedule" "PaymentSchedule" NOT NULL,
    "depositAmount" DECIMAL(10,2),
    "balanceAmount" DECIMAL(10,2),
    "stripePaymentIntentId" TEXT,
    "balanceReminderSentAt" TIMESTAMP(3),
    "balancePaidAt" TIMESTAMP(3),

    CONSTRAINT "DirectBooking_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "bookingId" TEXT,
    "privacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "policyVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BokunBooking" (
    "bookingId" TEXT NOT NULL,
    "bokunBookingId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "commissionAmount" DECIMAL(10,2),
    "netAmount" DECIMAL(10,2),
    "rawPayload" JSONB NOT NULL,

    CONSTRAINT "BokunBooking_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "CharterBooking" (
    "bookingId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "platformBookingRef" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "commissionAmount" DECIMAL(10,2),

    CONSTRAINT "CharterBooking_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "type" "PaymentType" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripeChargeId" TEXT,
    "stripeRefundId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedStripeEvent" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "ProcessedBokunEvent" (
    "eventId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedBokunEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "ProcessedBoataroundEvent" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedBoataroundEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "ProcessedCharterEmail" (
    "messageHash" TEXT NOT NULL,
    "platform" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedCharterEmail_pkey" PRIMARY KEY ("messageHash")
);

-- CreateTable
CREATE TABLE "ManualAlert" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "action" TEXT NOT NULL,
    "status" "ManualAlertStatus" NOT NULL DEFAULT 'PENDING',
    "bookingId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "ManualAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingNote" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "CrewRole" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "dailyRate" DECIMAL(10,2),
    "certifications" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripCrew" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "role" "CrewRole" NOT NULL,
    "hoursWorked" DOUBLE PRECISION,
    "cost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherForecastCache" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "locationKey" TEXT NOT NULL,
    "forecast" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherForecastCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRecoveryOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "BookingRecoveryOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRecoverySession" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "BookingRecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitEntry" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Service_bokunProductId_key" ON "Service"("bokunProductId");

-- CreateIndex
CREATE INDEX "PricingPeriod_serviceId_startDate_endDate_idx" ON "PricingPeriod"("serviceId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "HotDayRule_dateRangeStart_dateRangeEnd_active_idx" ON "HotDayRule"("dateRangeStart", "dateRangeEnd", "active");

-- CreateIndex
CREATE UNIQUE INDEX "HotDayOverride_date_serviceId_key" ON "HotDayOverride"("date", "serviceId");

-- CreateIndex
CREATE INDEX "BokunPriceSync_status_idx" ON "BokunPriceSync"("status");

-- CreateIndex
CREATE INDEX "BokunPriceSync_bokunExperienceId_date_idx" ON "BokunPriceSync"("bokunExperienceId", "date");

-- CreateIndex
CREATE INDEX "BoatAvailability_status_idx" ON "BoatAvailability"("status");

-- CreateIndex
CREATE INDEX "BoatAvailability_date_idx" ON "BoatAvailability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "BoatAvailability_boatId_date_key" ON "BoatAvailability"("boatId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_confirmationCode_key" ON "Booking"("confirmationCode");

-- CreateIndex
CREATE INDEX "Booking_source_status_idx" ON "Booking"("source", "status");

-- CreateIndex
CREATE INDEX "Booking_startDate_idx" ON "Booking"("startDate");

-- CreateIndex
CREATE INDEX "Booking_status_startDate_idx" ON "Booking"("status", "startDate");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "Booking_boatId_status_startDate_idx" ON "Booking"("boatId", "status", "startDate");

-- CreateIndex
CREATE INDEX "Booking_status_source_createdAt_idx" ON "Booking"("status", "source", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_source_externalRef_idx" ON "Booking"("source", "externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "DirectBooking_stripePaymentIntentId_key" ON "DirectBooking"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "DirectBooking_paymentSchedule_balanceReminderSentAt_balance_idx" ON "DirectBooking"("paymentSchedule", "balanceReminderSentAt", "balancePaidAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_customerId_idx" ON "ConsentRecord"("customerId");

-- CreateIndex
CREATE INDEX "ConsentRecord_bookingId_idx" ON "ConsentRecord"("bookingId");

-- CreateIndex
CREATE INDEX "ConsentRecord_acceptedAt_idx" ON "ConsentRecord"("acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BokunBooking_bokunBookingId_key" ON "BokunBooking"("bokunBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "CharterBooking_platformName_platformBookingRef_key" ON "CharterBooking"("platformName", "platformBookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeChargeId_key" ON "Payment"("stripeChargeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeRefundId_key" ON "Payment"("stripeRefundId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_type_idx" ON "Payment"("bookingId", "type");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "ProcessedStripeEvent_eventType_processedAt_idx" ON "ProcessedStripeEvent"("eventType", "processedAt");

-- CreateIndex
CREATE INDEX "ProcessedStripeEvent_processedAt_idx" ON "ProcessedStripeEvent"("processedAt");

-- CreateIndex
CREATE INDEX "ProcessedBokunEvent_topic_processedAt_idx" ON "ProcessedBokunEvent"("topic", "processedAt");

-- CreateIndex
CREATE INDEX "ProcessedBokunEvent_processedAt_idx" ON "ProcessedBokunEvent"("processedAt");

-- CreateIndex
CREATE INDEX "ProcessedBoataroundEvent_eventType_processedAt_idx" ON "ProcessedBoataroundEvent"("eventType", "processedAt");

-- CreateIndex
CREATE INDEX "ProcessedBoataroundEvent_processedAt_idx" ON "ProcessedBoataroundEvent"("processedAt");

-- CreateIndex
CREATE INDEX "ProcessedCharterEmail_processedAt_idx" ON "ProcessedCharterEmail"("processedAt");

-- CreateIndex
CREATE INDEX "ManualAlert_status_createdAt_idx" ON "ManualAlert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ManualAlert_channel_date_idx" ON "ManualAlert"("channel", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_email_key" ON "CrewMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TripCrew_bookingId_crewMemberId_key" ON "TripCrew"("bookingId", "crewMemberId");

-- CreateIndex
CREATE INDEX "WeatherForecastCache_fetchedAt_idx" ON "WeatherForecastCache"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherForecastCache_date_locationKey_source_key" ON "WeatherForecastCache"("date", "locationKey", "source");

-- CreateIndex
CREATE INDEX "BookingRecoveryOtp_email_expiresAt_idx" ON "BookingRecoveryOtp"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRecoverySession_tokenHash_key" ON "BookingRecoverySession"("tokenHash");

-- CreateIndex
CREATE INDEX "BookingRecoverySession_email_idx" ON "BookingRecoverySession"("email");

-- CreateIndex
CREATE INDEX "BookingRecoverySession_expiresAt_idx" ON "BookingRecoverySession"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimitEntry_identifier_scope_windowEnd_idx" ON "RateLimitEntry"("identifier", "scope", "windowEnd");

-- CreateIndex
CREATE INDEX "RateLimitEntry_blockedUntil_idx" ON "RateLimitEntry"("blockedUntil");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingPeriod" ADD CONSTRAINT "PricingPeriod_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotDayOverride" ADD CONSTRAINT "HotDayOverride_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoatAvailability" ADD CONSTRAINT "BoatAvailability_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectBooking" ADD CONSTRAINT "DirectBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BokunBooking" ADD CONSTRAINT "BokunBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterBooking" ADD CONSTRAINT "CharterBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNote" ADD CONSTRAINT "BookingNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCrew" ADD CONSTRAINT "TripCrew_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCrew" ADD CONSTRAINT "TripCrew_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

