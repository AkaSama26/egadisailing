# Plan 2 — Sito proprietario + Stripe checkout + OTP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Checkout sul sito proprietario con Stripe Elements embedded, supporto acconto/saldo configurabile per servizio, payment link automatico per il saldo, sistema "recupera prenotazione" via OTP, area cliente minimale.

**Architecture:** Server Actions + API routes per creare Payment Intents, Stripe Elements lato client, webhook Stripe per conferma pagamenti, cron job interno per invio payment link saldo 7 giorni prima. OTP generati in DB con rate limiting, sessioni cookie httpOnly, Cloudflare Turnstile come CAPTCHA fallback.

**Tech Stack:** Next.js 16, Stripe SDK + Stripe Elements, React Hook Form + Zod, Brevo per email, Cloudflare Turnstile, node-cron per scheduler.

**Spec di riferimento:** `docs/superpowers/specs/2026-04-17-platform-v2-design.md`
**Prerequisito:** Plan 1 completato.

---

## File Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── prenota/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx                   # Booking wizard container
│   │   │       ├── date-step.tsx              # Step 1
│   │   │       ├── people-step.tsx            # Step 2
│   │   │       ├── customer-step.tsx          # Step 3
│   │   │       ├── payment-step.tsx           # Step 4 (Stripe Elements)
│   │   │       └── success/
│   │   │           └── [code]/page.tsx
│   │   ├── recupera-prenotazione/
│   │   │   └── page.tsx
│   │   └── b/
│   │       └── sessione/
│   │           └── page.tsx
│   └── api/
│       ├── webhooks/
│       │   └── stripe/
│       │       └── route.ts
│       ├── payment-intent/
│       │   └── route.ts
│       └── cron/
│           └── balance-reminders/
│               └── route.ts
├── lib/
│   ├── stripe/
│   │   ├── server.ts                          # Stripe SDK server-side
│   │   ├── client.ts                          # Stripe.js loader
│   │   ├── payment-intents.ts                 # Create/capture/refund
│   │   └── webhook-handler.ts                 # Process Stripe events
│   ├── booking/
│   │   ├── create-direct.ts                   # Create DirectBooking
│   │   ├── confirm.ts                         # Confirm after payment
│   │   ├── cancel.ts                          # Cancel + refund
│   │   └── balance-link.ts                    # Generate payment link
│   ├── otp/
│   │   ├── generate.ts                        # Generate + hash
│   │   ├── verify.ts                          # Verify + consume
│   │   └── email.ts                           # Send OTP email
│   ├── session/
│   │   ├── create.ts                          # Create cookie session
│   │   └── verify.ts                          # Verify cookie
│   ├── email/
│   │   ├── brevo.ts                           # Brevo client
│   │   └── templates/
│   │       ├── booking-confirmation.ts
│   │       ├── balance-reminder.ts
│   │       └── otp.ts
│   └── turnstile/
│       └── verify.ts
└── components/
    └── booking/
        ├── booking-wizard.tsx
        ├── stripe-payment-form.tsx
        ├── weather-info-card.tsx
        ├── weather-guarantee-badge.tsx
        └── deposit-toggle.tsx
```

---

## Task 1: Install Stripe + Brevo + node-cron

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installa dipendenze**

Run:

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
npm install @getbrevo/brevo
npm install node-cron
npm install -D @types/node-cron
```

- [ ] **Step 2: Verifica**

Run: `npm ls stripe @stripe/react-stripe-js @getbrevo/brevo node-cron`
Expected: Tutte listate.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add stripe, brevo, node-cron"
```

---

## Task 2: ENV variables per Stripe/Brevo/Turnstile

**Files:**
- Modify: `.env.example`
- Modify: `.env`

- [ ] **Step 1: Aggiungi in `.env.example`**

```env
# Stripe (TEST keys per dev)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Brevo
BREVO_API_KEY=""
BREVO_SENDER_EMAIL="noreply@egadisailing.com"
BREVO_SENDER_NAME="Egadisailing"

# Cloudflare Turnstile
TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""

# App URL
APP_URL="http://localhost:3000"
APP_LOCALES_DEFAULT="it"
```

- [ ] **Step 2: Aggiungi valori dummy in `.env` (solo per sviluppo)**

Usa le TEST keys Stripe reali del cliente quando disponibili; per ora placeholder che permettono a TypeScript di compilare.

```env
STRIPE_SECRET_KEY="sk_test_placeholder"
STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"
STRIPE_WEBHOOK_SECRET="whsec_placeholder"
BREVO_API_KEY="placeholder"
BREVO_SENDER_EMAIL="noreply@egadisailing.com"
BREVO_SENDER_NAME="Egadisailing"
TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
APP_URL="http://localhost:3000"
APP_LOCALES_DEFAULT="it"
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "feat(env): add stripe, brevo, turnstile env vars"
```

---

## Task 3: Stripe server SDK + helpers

**Files:**
- Create: `src/lib/stripe/server.ts`
- Create: `src/lib/stripe/payment-intents.ts`

- [ ] **Step 1: Server SDK singleton**

Crea `src/lib/stripe/server.ts`:

```typescript
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }
  return _stripe;
}
```

- [ ] **Step 2: Payment Intents helpers**

Crea `src/lib/stripe/payment-intents.ts`:

```typescript
import { stripe } from "./server";
import { logger } from "@/lib/logger";
import { ExternalServiceError } from "@/lib/errors";

export interface CreatePaymentIntentOptions {
  amountCents: number;
  currency?: string;
  customerEmail: string;
  customerName: string;
  metadata: Record<string, string>;
  description: string;
}

export async function createPaymentIntent(
  opts: CreatePaymentIntentOptions,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  try {
    const intent = await stripe().paymentIntents.create({
      amount: opts.amountCents,
      currency: opts.currency ?? "eur",
      automatic_payment_methods: { enabled: true },
      receipt_email: opts.customerEmail,
      description: opts.description,
      metadata: opts.metadata,
    });

    logger.info(
      { paymentIntentId: intent.id, amountCents: opts.amountCents },
      "Payment intent created",
    );

    return {
      clientSecret: intent.client_secret!,
      paymentIntentId: intent.id,
    };
  } catch (err) {
    logger.error({ err }, "Stripe createPaymentIntent failed");
    throw new ExternalServiceError("Stripe", "createPaymentIntent failed", { err: String(err) });
  }
}

export async function retrievePaymentIntent(id: string) {
  return stripe().paymentIntents.retrieve(id);
}

export async function refundPayment(chargeId: string, amountCents?: number) {
  try {
    return await stripe().refunds.create({
      charge: chargeId,
      amount: amountCents,
    });
  } catch (err) {
    throw new ExternalServiceError("Stripe", "refund failed", { err: String(err) });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe/
git commit -m "feat(stripe): server SDK singleton + payment intent helpers"
```

---

## Task 4: Brevo email client

**Files:**
- Create: `src/lib/email/brevo.ts`
- Create: `src/lib/email/templates/otp.ts`
- Create: `src/lib/email/templates/booking-confirmation.ts`
- Create: `src/lib/email/templates/balance-reminder.ts`

- [ ] **Step 1: Brevo client**

Crea `src/lib/email/brevo.ts`:

```typescript
import * as Brevo from "@getbrevo/brevo";
import { logger } from "@/lib/logger";
import { ExternalServiceError } from "@/lib/errors";

let _api: Brevo.TransactionalEmailsApi | null = null;

function api(): Brevo.TransactionalEmailsApi {
  if (!_api) {
    const key = process.env.BREVO_API_KEY;
    if (!key) throw new Error("BREVO_API_KEY not set");
    const instance = new Brevo.TransactionalEmailsApi();
    instance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, key);
    _api = instance;
  }
  return _api;
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@egadisailing.com";
  const senderName = process.env.BREVO_SENDER_NAME ?? "Egadisailing";

  try {
    const email = new Brevo.SendSmtpEmail();
    email.sender = { email: senderEmail, name: senderName };
    email.to = [{ email: opts.to, name: opts.toName }];
    email.subject = opts.subject;
    email.htmlContent = opts.htmlContent;
    if (opts.textContent) email.textContent = opts.textContent;

    await api().sendTransacEmail(email);
    logger.info({ to: opts.to, subject: opts.subject }, "Email sent");
  } catch (err) {
    logger.error({ err, to: opts.to }, "Brevo sendEmail failed");
    throw new ExternalServiceError("Brevo", "sendEmail failed", { to: opts.to });
  }
}
```

- [ ] **Step 2: Template OTP**

Crea `src/lib/email/templates/otp.ts`:

```typescript
export function otpEmailTemplate(code: string): { subject: string; html: string; text: string } {
  const subject = "Il tuo codice Egadisailing";
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px;">
        <div style="max-width: 480px; margin: auto; background: white; padding: 32px; border-radius: 12px;">
          <h2 style="color: #0c3d5e; margin-top: 0;">Il tuo codice di accesso</h2>
          <p>Usa questo codice per accedere alla tua prenotazione:</p>
          <div style="font-size: 42px; letter-spacing: 12px; font-weight: bold; text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px; color: #0c3d5e; margin: 24px 0;">
            ${code}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Il codice è valido per 15 minuti. Non condividerlo con nessuno.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
            Se non hai richiesto questo codice, ignora questa email.
          </p>
        </div>
      </body>
    </html>
  `;
  const text = `Il tuo codice Egadisailing: ${code}\nValido per 15 minuti.\nNon condividerlo con nessuno.`;
  return { subject, html, text };
}
```

- [ ] **Step 3: Template booking confirmation**

Crea `src/lib/email/templates/booking-confirmation.ts`:

```typescript
export interface BookingConfirmationData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string; // formatted
  numPeople: number;
  totalPrice: string; // formatted
  paidAmount: string;
  balanceAmount?: string;
  recoveryUrl: string;
}

export function bookingConfirmationTemplate(data: BookingConfirmationData) {
  const subject = `Conferma prenotazione ${data.confirmationCode} · Egadisailing`;
  const balanceBlock = data.balanceAmount
    ? `<p style="color: #c2410c;"><strong>Saldo da versare:</strong> ${data.balanceAmount}<br>
         Ti invieremo un link per il pagamento 7 giorni prima dell'esperienza.</p>`
    : "";
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px;">
        <div style="max-width: 560px; margin: auto; background: white; padding: 32px; border-radius: 12px;">
          <h2 style="color: #0c3d5e; margin-top: 0;">Ciao ${data.customerName}, prenotazione confermata! 🌊</h2>
          <p><strong>Codice prenotazione:</strong> ${data.confirmationCode}</p>
          <p><strong>Esperienza:</strong> ${data.serviceName}</p>
          <p><strong>Data:</strong> ${data.startDate}</p>
          <p><strong>Persone:</strong> ${data.numPeople}</p>
          <p><strong>Totale:</strong> ${data.totalPrice}</p>
          <p><strong>Già pagato:</strong> ${data.paidAmount}</p>
          ${balanceBlock}
          <div style="margin: 32px 0; text-align: center;">
            <a href="${data.recoveryUrl}" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold;">
              Gestisci la prenotazione
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Per accedere alla tua prenotazione, inserisci la tua email su
            <a href="${data.recoveryUrl}">${data.recoveryUrl}</a> e riceverai un codice di verifica.
          </p>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}
```

- [ ] **Step 4: Template balance reminder**

Crea `src/lib/email/templates/balance-reminder.ts`:

```typescript
export interface BalanceReminderData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  balanceAmount: string;
  paymentLinkUrl: string;
}

export function balanceReminderTemplate(data: BalanceReminderData) {
  const subject = `Promemoria saldo · ${data.confirmationCode} Egadisailing`;
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px;">
        <div style="max-width: 560px; margin: auto; background: white; padding: 32px; border-radius: 12px;">
          <h2 style="color: #0c3d5e; margin-top: 0;">Ciao ${data.customerName}, manca solo il saldo 🌊</h2>
          <p>La tua esperienza <strong>${data.serviceName}</strong> del <strong>${data.startDate}</strong> si avvicina!</p>
          <p><strong>Saldo da versare: ${data.balanceAmount}</strong></p>
          <p>Puoi pagare online in pochi secondi cliccando qui sotto:</p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${data.paymentLinkUrl}" style="display: inline-block; background: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 16px;">
              Paga il saldo
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            In alternativa, puoi saldare in contanti o via POS al momento dell'imbarco.
          </p>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/
git commit -m "feat(email): brevo client + templates (otp, confirmation, balance reminder)"
```

---

## Task 5: Turnstile verifier

**Files:**
- Create: `src/lib/turnstile/verify.ts`

- [ ] **Step 1: Implementazione verify**

Crea `src/lib/turnstile/verify.ts`:

```typescript
import { logger } from "@/lib/logger";

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    logger.warn("TURNSTILE_SECRET_KEY not set, skipping verification");
    return true; // in dev permettiamo senza Turnstile
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    if (ip) body.append("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      logger.warn({ errors: data["error-codes"] }, "Turnstile verification failed");
    }
    return data.success;
  } catch (err) {
    logger.error({ err }, "Turnstile verify error");
    return false;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/turnstile/
git commit -m "feat(security): cloudflare turnstile token verifier"
```

---

## Task 6: OTP generation + verification

**Files:**
- Create: `src/lib/otp/generate.ts`
- Create: `src/lib/otp/verify.ts`
- Create: `src/lib/otp/email.ts`

- [ ] **Step 1: Generate**

Crea `src/lib/otp/generate.ts`:

```typescript
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";

const OTP_LIFETIME_MS = 15 * 60 * 1000; // 15 minuti

export function generateCode(): string {
  // 6 cifre, leading zeros preservati
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

export async function createOtp(
  email: string,
  ipAddress: string,
): Promise<{ code: string; otpId: string }> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + OTP_LIFETIME_MS);

  // Invalida OTP pendenti precedenti per la stessa email
  await db.bookingRecoveryOtp.updateMany({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  const otp = await db.bookingRecoveryOtp.create({
    data: { email, codeHash, expiresAt, ipAddress },
  });

  return { code, otpId: otp.id };
}
```

- [ ] **Step 2: Verify**

Crea `src/lib/otp/verify.ts`:

```typescript
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { OTP_LIMITS, blockEmail } from "@/lib/rate-limit/otp-limits";
import { ValidationError } from "@/lib/errors";

export interface OtpVerifyResult {
  valid: boolean;
  reason?: "EXPIRED" | "INVALID" | "TOO_MANY_ATTEMPTS" | "ALREADY_USED";
  email?: string;
}

export async function verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
  const now = new Date();
  const otp = await db.bookingRecoveryOtp.findFirst({
    where: {
      email,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { valid: false, reason: "EXPIRED" };
  }

  if (otp.attempts >= OTP_LIMITS.verifyAttemptsPerCode) {
    // invalido questo OTP
    await db.bookingRecoveryOtp.update({
      where: { id: otp.id },
      data: { expiresAt: now },
    });
    return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  const match = await bcrypt.compare(code, otp.codeHash);

  if (!match) {
    await db.bookingRecoveryOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false, reason: "INVALID" };
  }

  await db.bookingRecoveryOtp.update({
    where: { id: otp.id },
    data: { usedAt: now },
  });

  return { valid: true, email: otp.email };
}

export async function handleFailedVerifyAttempt(email: string): Promise<void> {
  // se un utente sbaglia troppe volte in un'ora, blocchiamo l'email per 1h
  const count = await db.rateLimitEntry.count({
    where: {
      identifier: email,
      scope: "OTP_VERIFY_EMAIL_HOUR",
      count: { gte: OTP_LIMITS.verifyPerEmailHour - 1 },
      windowEnd: { gt: new Date() },
    },
  });
  if (count > 0) {
    await blockEmail(email, 60 * 60);
    throw new ValidationError("Too many failed attempts, email temporarily blocked");
  }
}
```

- [ ] **Step 3: Send OTP email**

Crea `src/lib/otp/email.ts`:

```typescript
import { sendEmail } from "@/lib/email/brevo";
import { otpEmailTemplate } from "@/lib/email/templates/otp";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { subject, html, text } = otpEmailTemplate(code);
  await sendEmail({ to: email, subject, htmlContent: html, textContent: text });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/otp/
git commit -m "feat(otp): generate/verify with bcrypt + rate limit + email send"
```

---

## Task 7: Session management (cookie-based)

**Files:**
- Create: `src/lib/session/create.ts`
- Create: `src/lib/session/verify.ts`

- [ ] **Step 1: Session creation**

Crea `src/lib/session/create.ts`:

```typescript
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "egadi-booking-session";

export async function createBookingSession(
  email: string,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await db.bookingRecoverySession.create({
    data: { email, tokenHash, ipAddress: ip, userAgent, expiresAt },
  });

  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeBookingSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return;

  const sessions = await db.bookingRecoverySession.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
  });
  for (const s of sessions) {
    if (await bcrypt.compare(token, s.tokenHash)) {
      await db.bookingRecoverySession.update({
        where: { id: s.id },
        data: { revokedAt: new Date() },
      });
      break;
    }
  }
  store.delete(COOKIE_NAME);
}
```

- [ ] **Step 2: Session verify**

Crea `src/lib/session/verify.ts`:

```typescript
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "egadi-booking-session";

export interface BookingSessionInfo {
  email: string;
  sessionId: string;
}

export async function getBookingSession(): Promise<BookingSessionInfo | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const active = await db.bookingRecoverySession.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const s of active) {
    if (await bcrypt.compare(token, s.tokenHash)) {
      return { email: s.email, sessionId: s.id };
    }
  }
  return null;
}

export async function requireBookingSession(): Promise<BookingSessionInfo> {
  const s = await getBookingSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/session/
git commit -m "feat(session): cookie-based booking recovery sessions with bcrypt token hashing"
```

---

## Task 8: Booking creation service

**Files:**
- Create: `src/lib/booking/create-direct.ts`
- Create: `src/lib/booking/confirm.ts`

- [ ] **Step 1: Create direct booking**

Crea `src/lib/booking/create-direct.ts`:

```typescript
import crypto from "crypto";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { quotePrice } from "@/lib/pricing/service";
import { NotFoundError, ValidationError } from "@/lib/errors";

export interface CreateDirectBookingInput {
  serviceId: string;
  startDate: Date;
  endDate: Date;
  numPeople: number;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    nationality?: string;
    language?: string;
  };
  paymentSchedule: "FULL" | "DEPOSIT_BALANCE";
  depositPercentage?: number;
  weatherGuarantee: boolean;
  notes?: string;
}

export interface CreatedBooking {
  bookingId: string;
  confirmationCode: string;
  totalAmountCents: number;
  depositAmountCents: number;
  balanceAmountCents: number;
  upfrontAmountCents: number; // quanto effettivamente caricare ora con Stripe
}

export async function createPendingDirectBooking(
  input: CreateDirectBookingInput,
): Promise<CreatedBooking> {
  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw new NotFoundError("Service", input.serviceId);

  if (input.numPeople < 1 || input.numPeople > service.capacityMax) {
    throw new ValidationError(`Invalid numPeople: ${input.numPeople}`);
  }

  const quote = await quotePrice(input.serviceId, input.startDate, input.numPeople);
  const totalCents = Math.round(quote.totalPrice * 100);

  let depositCents = 0;
  let balanceCents = 0;
  if (input.paymentSchedule === "DEPOSIT_BALANCE") {
    const pct = input.depositPercentage ?? service.defaultDepositPercentage ?? 30;
    depositCents = Math.round((totalCents * pct) / 100);
    balanceCents = totalCents - depositCents;
  }

  const confirmationCode = generateConfirmationCode();

  const customer = await db.customer.upsert({
    where: { email: input.customer.email.toLowerCase() },
    update: {
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      phone: input.customer.phone,
      nationality: input.customer.nationality,
      language: input.customer.language,
    },
    create: {
      email: input.customer.email.toLowerCase(),
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      phone: input.customer.phone,
      nationality: input.customer.nationality,
      language: input.customer.language,
    },
  });

  const booking = await db.booking.create({
    data: {
      confirmationCode,
      source: "DIRECT",
      customerId: customer.id,
      serviceId: service.id,
      boatId: service.boatId,
      startDate: input.startDate,
      endDate: input.endDate,
      numPeople: input.numPeople,
      totalPrice: new Prisma.Decimal(quote.totalPrice),
      weatherGuarantee: input.weatherGuarantee,
      notes: input.notes,
      status: "PENDING",
      directBooking: {
        create: {
          paymentSchedule: input.paymentSchedule,
          depositAmount: input.paymentSchedule === "DEPOSIT_BALANCE"
            ? new Prisma.Decimal(depositCents / 100)
            : null,
          balanceAmount: input.paymentSchedule === "DEPOSIT_BALANCE"
            ? new Prisma.Decimal(balanceCents / 100)
            : null,
        },
      },
    },
  });

  const upfrontCents = input.paymentSchedule === "DEPOSIT_BALANCE" ? depositCents : totalCents;

  return {
    bookingId: booking.id,
    confirmationCode,
    totalAmountCents: totalCents,
    depositAmountCents: depositCents,
    balanceAmountCents: balanceCents,
    upfrontAmountCents: upfrontCents,
  };
}

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";
  let code = "ES-";
  for (let i = 0; i < 7; i++) code += chars[crypto.randomInt(0, chars.length)];
  return code;
}
```

- [ ] **Step 2: Confirm booking after payment**

Crea `src/lib/booking/confirm.ts`:

```typescript
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { blockDates } from "@/lib/availability/service";
import { logger } from "@/lib/logger";
import { NotFoundError } from "@/lib/errors";

/**
 * Marca la Booking come CONFIRMED, crea Payment, blocca availability e triggera fan-out.
 */
export async function confirmDirectBookingAfterPayment(params: {
  bookingId: string;
  stripePaymentIntentId: string;
  stripeChargeId: string;
  amountCents: number;
  paymentType: "FULL" | "DEPOSIT";
}): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: params.bookingId },
    include: { directBooking: true },
  });
  if (!booking) throw new NotFoundError("Booking", params.bookingId);

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    });

    await tx.directBooking.update({
      where: { bookingId: booking.id },
      data: { stripePaymentIntentId: params.stripePaymentIntentId },
    });

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        amount: new Prisma.Decimal(params.amountCents / 100),
        type: params.paymentType === "FULL" ? "FULL" : "DEPOSIT",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: params.stripeChargeId,
        processedAt: new Date(),
      },
    });
  });

  // Blocca availability per tutte le date del booking (fuori dalla transaction — triggera fan-out)
  await blockDates(
    booking.boatId,
    booking.startDate,
    booking.endDate,
    "DIRECT",
    booking.id,
  );

  logger.info(
    { bookingId: booking.id, confirmationCode: booking.confirmationCode },
    "Direct booking confirmed",
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking/
git commit -m "feat(booking): create pending direct booking + confirm after stripe payment"
```

---

## Task 9: API route per creare Payment Intent

**Files:**
- Create: `src/app/api/payment-intent/route.ts`

- [ ] **Step 1: API route**

Crea `src/app/api/payment-intent/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingDirectBooking } from "@/lib/booking/create-direct";
import { createPaymentIntent } from "@/lib/stripe/payment-intents";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

const schema = z.object({
  serviceId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  numPeople: z.number().int().min(1).max(50),
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    nationality: z.string().length(2).optional(),
    language: z.string().optional(),
  }),
  paymentSchedule: z.enum(["FULL", "DEPOSIT_BALANCE"]),
  depositPercentage: z.number().int().min(1).max(100).optional(),
  weatherGuarantee: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = schema.parse(body);

    const booking = await createPendingDirectBooking({
      serviceId: input.serviceId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      numPeople: input.numPeople,
      customer: input.customer,
      paymentSchedule: input.paymentSchedule,
      depositPercentage: input.depositPercentage,
      weatherGuarantee: input.weatherGuarantee,
      notes: input.notes,
    });

    const pi = await createPaymentIntent({
      amountCents: booking.upfrontAmountCents,
      customerEmail: input.customer.email,
      customerName: `${input.customer.firstName} ${input.customer.lastName}`,
      description: `Egadisailing ${booking.confirmationCode}`,
      metadata: {
        bookingId: booking.bookingId,
        confirmationCode: booking.confirmationCode,
        paymentType: input.paymentSchedule === "DEPOSIT_BALANCE" ? "DEPOSIT" : "FULL",
      },
    });

    return NextResponse.json({
      confirmationCode: booking.confirmationCode,
      clientSecret: pi.clientSecret,
      amountCents: booking.upfrontAmountCents,
      totalCents: booking.totalAmountCents,
      balanceCents: booking.balanceAmountCents,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.toJSON() }, { status: err.statusCode });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", issues: err.issues } },
        { status: 400 },
      );
    }
    logger.error({ err }, "payment-intent route error");
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/payment-intent/
git commit -m "feat(api): POST /api/payment-intent - create booking + stripe payment intent"
```

---

## Task 10: Stripe webhook handler

**Files:**
- Create: `src/lib/stripe/webhook-handler.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Handler**

Crea `src/lib/stripe/webhook-handler.ts`:

```typescript
import type Stripe from "stripe";
import { confirmDirectBookingAfterPayment } from "@/lib/booking/confirm";
import { sendEmail } from "@/lib/email/brevo";
import { bookingConfirmationTemplate } from "@/lib/email/templates/booking-confirmation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  logger.info({ type: event.type, id: event.id }, "Stripe event received");

  switch (event.type) {
    case "payment_intent.succeeded":
      await onPaymentIntentSucceeded(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await onPaymentIntentFailed(event.data.object);
      break;
    case "charge.refunded":
      await onChargeRefunded(event.data.object);
      break;
    default:
      logger.debug({ type: event.type }, "Unhandled stripe event");
  }
}

async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const bookingId = pi.metadata.bookingId;
  const paymentType = (pi.metadata.paymentType as "FULL" | "DEPOSIT") ?? "FULL";
  if (!bookingId) return;

  const charge = pi.latest_charge as string;
  await confirmDirectBookingAfterPayment({
    bookingId,
    stripePaymentIntentId: pi.id,
    stripeChargeId: charge,
    amountCents: pi.amount_received,
    paymentType,
  });

  // Email conferma
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, service: true, directBooking: true },
  });
  if (!booking) return;

  const { subject, html } = bookingConfirmationTemplate({
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    confirmationCode: booking.confirmationCode,
    serviceName: booking.service.name,
    startDate: booking.startDate.toLocaleDateString("it-IT"),
    numPeople: booking.numPeople,
    totalPrice: `€${booking.totalPrice.toNumber().toFixed(2)}`,
    paidAmount: `€${(pi.amount_received / 100).toFixed(2)}`,
    balanceAmount: booking.directBooking?.balanceAmount
      ? `€${booking.directBooking.balanceAmount.toNumber().toFixed(2)}`
      : undefined,
    recoveryUrl: `${process.env.APP_URL}/it/recupera-prenotazione`,
  });

  await sendEmail({
    to: booking.customer.email,
    toName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    subject,
    htmlContent: html,
  });
}

async function onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const bookingId = pi.metadata.bookingId;
  if (!bookingId) return;
  logger.warn(
    { bookingId, last_payment_error: pi.last_payment_error?.message },
    "Payment intent failed",
  );
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const payment = await db.payment.findFirst({ where: { stripeChargeId: charge.id } });
  if (!payment) return;
  await db.payment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED" },
  });
  logger.info({ paymentId: payment.id, chargeId: charge.id }, "Payment marked as refunded");
}
```

- [ ] **Step 2: API route**

Crea `src/app/api/webhooks/stripe/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { handleStripeEvent } from "@/lib/stripe/webhook-handler";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    logger.error({ err }, "Stripe webhook signature invalid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, "Stripe webhook handler error");
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

// Stripe richiede raw body — Next.js App Router gestisce con req.text() sopra
export const runtime = "nodejs";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe/webhook-handler.ts src/app/api/webhooks/stripe/
git commit -m "feat(stripe): webhook handler - confirm booking + send email + refund tracking"
```

---

## Task 11: Balance payment link + cron reminder

**Files:**
- Create: `src/lib/booking/balance-link.ts`
- Create: `src/app/api/cron/balance-reminders/route.ts`

- [ ] **Step 1: Genera payment link per saldo**

Crea `src/lib/booking/balance-link.ts`:

```typescript
import { stripe } from "@/lib/stripe/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors";

export async function createBalancePaymentLink(bookingId: string): Promise<string> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, service: true, directBooking: true },
  });
  if (!booking || !booking.directBooking) {
    throw new NotFoundError("DirectBooking", bookingId);
  }

  const balanceAmount = booking.directBooking.balanceAmount;
  if (!balanceAmount || balanceAmount.lte(new Prisma.Decimal(0))) {
    throw new ValidationError("No balance due for this booking");
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: booking.customer.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(balanceAmount.toNumber() * 100),
          product_data: {
            name: `Saldo ${booking.confirmationCode} · ${booking.service.name}`,
          },
        },
      },
    ],
    metadata: {
      bookingId: booking.id,
      confirmationCode: booking.confirmationCode,
      paymentType: "BALANCE",
    },
    success_url: `${process.env.APP_URL}/it/prenota/success/${booking.confirmationCode}`,
    cancel_url: `${process.env.APP_URL}/it/recupera-prenotazione`,
  });

  return session.url!;
}
```

- [ ] **Step 2: Cron route**

Crea `src/app/api/cron/balance-reminders/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createBalancePaymentLink } from "@/lib/booking/balance-link";
import { sendEmail } from "@/lib/email/brevo";
import { balanceReminderTemplate } from "@/lib/email/templates/balance-reminder";
import { logger } from "@/lib/logger";

/**
 * Esegue quotidianamente e invia payment link a prenotazioni che hanno il saldo pendente
 * e l'esperienza fra ~7 giorni.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? "dev-cron"}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysFrom = new Date(now);
  sevenDaysFrom.setUTCDate(sevenDaysFrom.getUTCDate() + 7);
  const eightDaysFrom = new Date(now);
  eightDaysFrom.setUTCDate(eightDaysFrom.getUTCDate() + 8);

  const candidates = await db.booking.findMany({
    where: {
      source: "DIRECT",
      status: "CONFIRMED",
      startDate: { gte: sevenDaysFrom, lt: eightDaysFrom },
      directBooking: {
        paymentSchedule: "DEPOSIT_BALANCE",
        balancePaidAt: null,
        balanceReminderSentAt: null,
      },
    },
    include: { customer: true, service: true, directBooking: true },
  });

  const results: Array<{ bookingId: string; sent: boolean; error?: string }> = [];

  for (const b of candidates) {
    try {
      const link = await createBalancePaymentLink(b.id);
      const { subject, html } = balanceReminderTemplate({
        customerName: `${b.customer.firstName} ${b.customer.lastName}`,
        confirmationCode: b.confirmationCode,
        serviceName: b.service.name,
        startDate: b.startDate.toLocaleDateString("it-IT"),
        balanceAmount: `€${b.directBooking!.balanceAmount!.toNumber().toFixed(2)}`,
        paymentLinkUrl: link,
      });
      await sendEmail({
        to: b.customer.email,
        toName: `${b.customer.firstName} ${b.customer.lastName}`,
        subject,
        htmlContent: html,
      });
      await db.directBooking.update({
        where: { bookingId: b.id },
        data: { balanceReminderSentAt: new Date() },
      });
      results.push({ bookingId: b.id, sent: true });
    } catch (err) {
      logger.error({ err, bookingId: b.id }, "Balance reminder failed");
      results.push({ bookingId: b.id, sent: false, error: String(err) });
    }
  }

  return NextResponse.json({ processed: candidates.length, results });
}
```

- [ ] **Step 3: ENV per cron secret**

Aggiungi in `.env.example`:
```env
CRON_SECRET="dev-cron"
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/balance-link.ts src/app/api/cron/balance-reminders/ .env.example
git commit -m "feat(cron): balance reminder daily job - payment link + email 7 days before"
```

---

## Task 12: Frontend — booking wizard page

**Files:**
- Create: `src/app/[locale]/prenota/[slug]/page.tsx`
- Create: `src/components/booking/booking-wizard.tsx`
- Create: `src/components/booking/stripe-payment-form.tsx`

- [ ] **Step 1: Page container**

Crea `src/app/[locale]/prenota/[slug]/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { BookingWizard } from "@/components/booking/booking-wizard";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const service = await db.service.findUnique({ where: { id: slug } });
  if (!service || !service.active) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-white text-4xl md:text-5xl font-heading font-bold mb-8 text-center">
          Prenota {service.name}
        </h1>
        <BookingWizard
          serviceId={service.id}
          serviceName={service.name}
          durationType={service.durationType}
          durationHours={service.durationHours}
          capacityMax={service.capacityMax}
          defaultPaymentSchedule={service.defaultPaymentSchedule}
          defaultDepositPercentage={service.defaultDepositPercentage}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wizard client component**

Crea `src/components/booking/booking-wizard.tsx`:

```typescript
"use client";

import { useState } from "react";
import { StripePaymentForm } from "./stripe-payment-form";

type Step = "date" | "people" | "customer" | "payment" | "success";

interface Props {
  serviceId: string;
  serviceName: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  defaultPaymentSchedule: "FULL" | "DEPOSIT_BALANCE";
  defaultDepositPercentage: number | null;
}

export function BookingWizard(props: Props) {
  const [step, setStep] = useState<Step>("date");
  const [state, setState] = useState({
    startDate: "",
    endDate: "",
    numPeople: 1,
    customer: { email: "", firstName: "", lastName: "", phone: "", nationality: "IT", language: "it" },
    paymentSchedule: props.defaultPaymentSchedule,
    weatherGuarantee: true,
    confirmationCode: "",
    clientSecret: "",
    totalCents: 0,
    upfrontCents: 0,
  });

  async function createIntent() {
    const res = await fetch("/api/payment-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId: props.serviceId,
        startDate: state.startDate,
        endDate: state.endDate || state.startDate,
        numPeople: state.numPeople,
        customer: state.customer,
        paymentSchedule: state.paymentSchedule,
        depositPercentage: props.defaultDepositPercentage ?? undefined,
        weatherGuarantee: state.weatherGuarantee,
      }),
    });
    if (!res.ok) throw new Error("Failed to create payment intent");
    const data = await res.json();
    setState((s) => ({
      ...s,
      confirmationCode: data.confirmationCode,
      clientSecret: data.clientSecret,
      totalCents: data.totalCents,
      upfrontCents: data.amountCents,
    }));
    setStep("payment");
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      {step === "date" && (
        <DateStep
          onNext={(startDate, endDate) => {
            setState((s) => ({ ...s, startDate, endDate }));
            setStep("people");
          }}
        />
      )}
      {step === "people" && (
        <PeopleStep
          capacityMax={props.capacityMax}
          numPeople={state.numPeople}
          onNext={(num) => {
            setState((s) => ({ ...s, numPeople: num }));
            setStep("customer");
          }}
        />
      )}
      {step === "customer" && (
        <CustomerStep
          onNext={(customer) => {
            setState((s) => ({ ...s, customer }));
            void createIntent();
          }}
        />
      )}
      {step === "payment" && state.clientSecret && (
        <StripePaymentForm
          clientSecret={state.clientSecret}
          confirmationCode={state.confirmationCode}
          amountCents={state.upfrontCents}
          onSuccess={() => setStep("success")}
        />
      )}
      {step === "success" && (
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-emerald-600">Prenotazione confermata! 🌊</h2>
          <p>Codice: <strong>{state.confirmationCode}</strong></p>
          <p>Controlla la tua email per i dettagli.</p>
        </div>
      )}
    </div>
  );
}

function DateStep({ onNext }: { onNext: (startDate: string, endDate: string) => void }) {
  const [date, setDate] = useState("");
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Scegli la data</h2>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300"
        min={new Date().toISOString().slice(0, 10)}
      />
      <button
        onClick={() => date && onNext(new Date(date).toISOString(), new Date(date).toISOString())}
        disabled={!date}
        className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
      >
        Avanti
      </button>
    </div>
  );
}

function PeopleStep({
  capacityMax,
  numPeople,
  onNext,
}: {
  capacityMax: number;
  numPeople: number;
  onNext: (num: number) => void;
}) {
  const [num, setNum] = useState(numPeople);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Quante persone?</h2>
      <input
        type="number"
        min={1}
        max={capacityMax}
        value={num}
        onChange={(e) => setNum(parseInt(e.target.value, 10))}
        className="w-full px-4 py-3 rounded-lg border border-gray-300"
      />
      <button
        onClick={() => onNext(num)}
        className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold"
      >
        Avanti
      </button>
    </div>
  );
}

function CustomerStep({
  onNext,
}: {
  onNext: (customer: { email: string; firstName: string; lastName: string; phone: string; nationality: string; language: string }) => void;
}) {
  const [customer, setCustomer] = useState({
    email: "", firstName: "", lastName: "", phone: "", nationality: "IT", language: "it",
  });
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">I tuoi dati</h2>
      <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-lg border border-gray-300"
        value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <input type="text" placeholder="Nome" className="px-4 py-3 rounded-lg border border-gray-300"
          value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} />
        <input type="text" placeholder="Cognome" className="px-4 py-3 rounded-lg border border-gray-300"
          value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
      </div>
      <input type="tel" placeholder="Telefono" className="w-full px-4 py-3 rounded-lg border border-gray-300"
        value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
      <button
        onClick={() => onNext(customer)}
        disabled={!customer.email || !customer.firstName || !customer.lastName}
        className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
      >
        Procedi al pagamento
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Stripe payment form**

Crea `src/components/booking/stripe-payment-form.tsx`:

```typescript
"use client";

import { useEffect, useMemo } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}

interface Props {
  clientSecret: string;
  confirmationCode: string;
  amountCents: number;
  onSuccess: () => void;
}

export function StripePaymentForm(props: Props) {
  const options = useMemo(() => ({ clientSecret: props.clientSecret }), [props.clientSecret]);
  return (
    <Elements stripe={getStripe()} options={options}>
      <InnerForm {...props} />
    </Elements>
  );
}

function InnerForm({ amountCents, confirmationCode, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/it/prenota/success/${confirmationCode}`,
      },
      redirect: "if_required",
    });

    if (error) {
      alert(error.message ?? "Errore pagamento");
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Pagamento</h2>
      <p className="text-gray-600">Totale da pagare ora: <strong>€{(amountCents / 100).toFixed(2)}</strong></p>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe}
        className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold"
      >
        Paga €{(amountCents / 100).toFixed(2)}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Aggiungi public env per Stripe**

Aggiorna `.env` e `.env.example` per la publishable key:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\[locale\]/prenota/ src/components/booking/ .env.example
git commit -m "feat(site): booking wizard page with date/people/customer steps + stripe payment form"
```

---

## Task 13: Frontend — recupera prenotazione (OTP flow)

**Files:**
- Create: `src/app/[locale]/recupera-prenotazione/page.tsx`
- Create: `src/app/[locale]/recupera-prenotazione/actions.ts`

- [ ] **Step 1: Server actions**

Crea `src/app/[locale]/recupera-prenotazione/actions.ts`:

```typescript
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createOtp } from "@/lib/otp/generate";
import { verifyOtp } from "@/lib/otp/verify";
import { sendOtpEmail } from "@/lib/otp/email";
import { enforceOtpRequestLimit, enforceOtpVerifyLimit } from "@/lib/rate-limit/otp-limits";
import { createBookingSession } from "@/lib/session/create";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";

const requestSchema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().optional(),
});

export async function requestOtp(formData: FormData) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const parsed = requestSchema.parse({
    email: formData.get("email"),
    turnstileToken: formData.get("turnstile-token") ?? undefined,
  });

  const email = parsed.email.toLowerCase();

  // Turnstile (soft: solo se presente)
  if (parsed.turnstileToken) {
    const valid = await verifyTurnstileToken(parsed.turnstileToken, ip);
    if (!valid) throw new Error("Turnstile validation failed");
  }

  await enforceOtpRequestLimit(email, ip);

  const { code } = await createOtp(email, ip);
  await sendOtpEmail(email, code);
}

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function verifyOtpAndLogin(formData: FormData) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = h.get("user-agent") ?? null;

  const parsed = verifySchema.parse({
    email: formData.get("email"),
    code: formData.get("code"),
  });

  const email = parsed.email.toLowerCase();

  await enforceOtpVerifyLimit(email, ip);

  const result = await verifyOtp(email, parsed.code);
  if (!result.valid) {
    throw new Error(`Invalid OTP: ${result.reason}`);
  }

  await createBookingSession(email, ip, userAgent);
  redirect("/it/b/sessione");
}
```

- [ ] **Step 2: Page**

Crea `src/app/[locale]/recupera-prenotazione/page.tsx`:

```typescript
import { requestOtp, verifyOtpAndLogin } from "./actions";

export default function RecuperaPrenotazionePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold mb-2">Recupera la tua prenotazione</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Inserisci l'email usata al momento della prenotazione. Ti invieremo un codice di verifica.
        </p>

        <form action={requestOtp} className="space-y-3 mb-8">
          <input
            name="email"
            type="email"
            placeholder="tu@email.com"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300"
          />
          <button className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold">
            Invia codice
          </button>
        </form>

        <hr className="my-6" />

        <h2 className="text-lg font-semibold mb-3">Hai già un codice?</h2>
        <form action={verifyOtpAndLogin} className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="tu@email.com"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300"
          />
          <input
            name="code"
            inputMode="numeric"
            maxLength={6}
            placeholder="______"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 tracking-[8px] text-center text-xl"
          />
          <button className="w-full py-3 rounded-full bg-[#0c3d5e] text-white font-bold">
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/recupera-prenotazione/
git commit -m "feat(site): recupera-prenotazione page with OTP request + verify server actions"
```

---

## Task 14: Frontend — area cliente

**Files:**
- Create: `src/app/[locale]/b/sessione/page.tsx`

- [ ] **Step 1: Lista prenotazioni**

Crea `src/app/[locale]/b/sessione/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getBookingSession } from "@/lib/session/verify";

export default async function SessionePage() {
  const session = await getBookingSession();
  if (!session) redirect("/it/recupera-prenotazione");

  const bookings = await db.booking.findMany({
    where: { customer: { email: session.email } },
    include: { service: true, directBooking: true, payments: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-white text-3xl font-bold mb-6">Le tue prenotazioni</h1>
        {bookings.length === 0 && (
          <p className="text-white/70">Nessuna prenotazione trovata per {session.email}.</p>
        )}
        {bookings.map((b) => {
          const paidCents = b.payments
            .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
            .reduce((acc, p) => acc + Math.round(p.amount.toNumber() * 100), 0);
          const totalCents = Math.round(b.totalPrice.toNumber() * 100);
          const balanceCents = totalCents - paidCents;
          return (
            <div key={b.id} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-xl font-bold">{b.service.name}</h2>
                  <p className="text-gray-600 text-sm">Codice {b.confirmationCode}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {b.status}
                </span>
              </div>
              <p>📅 {b.startDate.toLocaleDateString("it-IT")} · 👥 {b.numPeople}</p>
              <p>💰 Totale €{b.totalPrice.toNumber().toFixed(2)} · Pagato €{(paidCents / 100).toFixed(2)}</p>
              {balanceCents > 0 && (
                <p className="text-amber-700 font-semibold mt-2">Saldo da pagare: €{(balanceCents / 100).toFixed(2)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/b/sessione/
git commit -m "feat(site): customer session page - list bookings for authenticated email"
```

---

## Task 15: Cron scheduler internal

**Files:**
- Create: `src/lib/cron/scheduler.ts`
- Modify: ambiente di runtime per avviare lo scheduler

- [ ] **Step 1: Scheduler setup**

Crea `src/lib/cron/scheduler.ts`:

```typescript
import cron from "node-cron";
import { logger } from "@/lib/logger";

let started = false;

export function startCronScheduler(): void {
  if (started) return;
  started = true;

  // Balance reminders: ogni giorno alle 07:00 Europe/Rome
  cron.schedule(
    "0 7 * * *",
    async () => {
      logger.info("Running balance-reminders cron");
      const url = `${process.env.APP_URL}/api/cron/balance-reminders`;
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "dev-cron"}` },
      });
      logger.info({ status: res.status }, "balance-reminders cron response");
    },
    { timezone: "Europe/Rome" },
  );

  logger.info("Cron scheduler started");
}
```

- [ ] **Step 2: Avvia lo scheduler all'init del server**

Crea `src/instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronScheduler } = await import("@/lib/cron/scheduler");
    startCronScheduler();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/cron/ src/instrumentation.ts
git commit -m "feat(cron): internal scheduler (node-cron) launches balance-reminders daily 07:00"
```

---

## Task 16: Verifica finale + smoke tests

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build success.

- [ ] **Step 3: Dev server**

Run: `npm run dev` (in background o terminale separato)
Testa manualmente:
- `GET /it/prenota/social-boating` → mostra wizard step 1
- `GET /it/recupera-prenotazione` → mostra form OTP

- [ ] **Step 4: Commit finale**

```bash
git status
```
Expected: working tree clean.

---

## Self-review

- [x] **Spec coverage**: booking wizard con Stripe ✓, acconto configurabile ✓, saldo via cron + payment link ✓, OTP con rate limit ✓, session cookie ✓, Turnstile wrapper ✓, email conferma + reminder ✓, area cliente ✓.
- [x] **Placeholder scan**: nessun TBD, tutti i blocchi completi.
- [x] **Type consistency**: enum `PaymentSchedule` e `PaymentType` coerenti con Plan 1. `confirmationCode` formato `ES-XXXXXXX`. `amountCents` (integer) vs `amount` (Decimal) distinti coerentemente.
