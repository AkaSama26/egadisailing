# Stripe Checkout production rollout

Questo runbook copre il passaggio in produzione al Checkout hosted di
Stripe. Il DB resta il master dei prezzi: il totale viene calcolato dal
server, congelato sulla prenotazione `PENDING` e inviato a Stripe come
`price_data.unit_amount`.

## Stato iniziale sicuro

La feature e' dietro flag:

```env
FEATURE_STRIPE_CHECKOUT_ENABLED=false
```

Con il flag spento il wizard continua a usare il flusso legacy
PaymentIntent/PaymentElement. Il nuovo endpoint `/api/checkout-session`
risponde solo quando il flag e' attivo.

## Pre-requisiti

- Release deployata su `main` con la migration
  `20260502143000_stripe_checkout_sessions`.
- Env Stripe live configurati:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Webhook Stripe live puntato a:

```text
https://egadisailing.com/api/webhooks/stripe
```

- Endpoint webhook con questi eventi almeno:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `charge.refunded`
  - `charge.dispute.created`
  - `charge.dispute.updated`
  - `charge.dispute.closed`

## Deploy

```bash
cd /home/ubuntu/egadisailing
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build app
```

L'entrypoint dell'app esegue `prisma migrate deploy` prima dello start di
Next. Se si sta facendo un deploy non containerizzato, applicare prima le
migration:

```bash
npm run db:deploy
```

Verifica post-deploy:

```bash
curl -s https://egadisailing.com/api/health
docker compose -f docker-compose.prod.yml logs app | tail -80
```

## Attivazione

Quando la release e' sana, attivare il flag in `.env`:

```env
FEATURE_STRIPE_CHECKOUT_ENABLED=true
```

Poi riavviare l'app:

```bash
docker compose -f docker-compose.prod.yml restart app
```

Da questo momento il click su "Conferma" crea una Checkout Session hosted e
redirige l'utente su `checkout.stripe.com`.

## Smoke test

In staging o test mode Stripe:

1. Aprire il booking wizard pubblico.
2. Creare una prenotazione con pagamento completo.
3. Verificare il redirect a Stripe Checkout.
4. Pagare con carta test Stripe.
5. Verificare il ritorno a `/it/prenota/success/[confirmationCode]`.
6. Verificare che il webhook `payment_intent.succeeded` confermi la booking.

Ripetere con acconto, carta rifiutata e checkout abbandonato/scaduto.

In produzione live non usare carte test. Per un test reale, usare una
prenotazione interna a basso rischio e poi rimborsarla dal backoffice o dalla
Dashboard Stripe.

## Cosa controllare nei log

Log attesi nel flusso sano:

- creazione Checkout Session
- osservazione `checkout.session.completed`
- ricezione `payment_intent.succeeded`
- conferma booking diretta

Per gli abbandoni, il cron pending GC deve poter chiudere le sessioni aperte;
la risposta del cron include il contatore `checkoutExpired`.

## Rollback

Per tornare al PaymentElement legacy:

```env
FEATURE_STRIPE_CHECKOUT_ENABLED=false
```

Poi:

```bash
docker compose -f docker-compose.prod.yml restart app
```

Le Checkout Session gia' aperte possono ancora completarsi: il webhook resta
compatibile e conferma sempre tramite `payment_intent.succeeded`. Se serve
chiudere una sessione aperta manualmente, usare la Dashboard Stripe o attendere
il pending GC.

## GDPR

Stripe deve ricevere solo il minimo indispensabile:

- email cliente
- nome prodotto generico
- importo
- metadata tecnici: `bookingId`, `confirmationCode`, `paymentType`

Non attivare `phone_number_collection`, `shipping_address_collection`,
`tax_id_collection`, `customer_creation: always` o `adjustable_quantity` senza
una nuova revisione privacy/legal.
