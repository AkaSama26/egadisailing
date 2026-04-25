import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { withDedupedEvent } from "@/lib/dedup/processed-event";
import {
  onPaymentIntentSucceeded,
  onPaymentIntentFailed,
  onPaymentIntentCanceled,
  onChargeRefunded,
  onChargeDispute,
} from "./handlers";

/**
 * Handler dei webhook Stripe.
 *
 * Idempotency: marker `ProcessedStripeEvent` inserito ALLA FINE (dopo tutti
 * i side-effect). Se il processo crasha a metà:
 *  - Stripe riprova (5xx)
 *  - al secondo tentativo, Payment.stripeChargeId @unique previene doppio insert
 *  - booking.updateMany(status=PENDING) previene doppia transizione
 *  - blockDates e' idempotente (self-echo)
 *  - marker viene finalmente scritto
 *
 * Il marker serve solo a evitare lavoro ridondante quando l'handler e' gia'
 * completato correttamente (non e' l'unica linea di difesa contro duplicati).
 *
 * Phase 8: per-event handlers split into ./handlers/ per readability.
 * Questo file resta dispatcher + dedup wrapper (entry point).
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  logger.info({ type: event.type, id: event.id }, "Stripe event received");

  // R28-CRIT-2: dedup pre-check (read-only) PRIMA degli side-effect, marker
  // ALLA FINE post-side-effect. Helper centralizzato in `lib/dedup/processed-event`.
  await withDedupedEvent(
    "ProcessedStripeEvent",
    event.id,
    { eventType: event.type },
    async () => {
      switch (event.type) {
        case "payment_intent.succeeded":
          await onPaymentIntentSucceeded(event.data.object);
          break;
        case "payment_intent.payment_failed":
          await onPaymentIntentFailed(event.data.object);
          break;
        case "payment_intent.canceled":
          // R23-S-ALTA-1: Stripe auto-cancel PI dopo 24h requires_payment_method
          // + admin manual cancel via cancelPaymentIntent helper. Senza questo
          // handler il booking restava PENDING fino al cron pending-gc (30min+).
          await onPaymentIntentCanceled(event.data.object);
          break;
        case "charge.refunded":
          await onChargeRefunded(event.data.object);
          break;
        case "charge.dispute.created":
        case "charge.dispute.updated":
        case "charge.dispute.closed":
          // R27-CRIT-4: chargeback/dispute. Senza handler, l'evento finiva in
          // `default` log + marker → admin NON notificato → slot BLOCKED per
          // 30gg di dispute window senza possibilita' di rivendere. GDPR art.
          // 33 + perdita revenue €500-2000/caso. Ora notify sincrono admin +
          // log persistente (no release automatico: dispute potrebbe essere
          // winnable).
          await onChargeDispute(event.data.object as Stripe.Dispute, event.type);
          break;
        default:
          logger.debug({ type: event.type }, "Unhandled stripe event");
      }
    },
  );
}
