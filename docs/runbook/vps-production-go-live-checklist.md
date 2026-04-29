# VPS production go-live checklist

**Scopo**: documento operativo per capire cosa deve essere pronto prima di
mettere Egadisailing live su VPS. Questo file e' una checklist pre-flight:
per i comandi di deploy dettagliati usare anche:

- `docs/runbook/deployment.md`
- `docs/runbook/operations.md`
- `docs/runbook/operational-playbook.md`

**Decisione di base**: il sito puo' andare live solo quando i blocchi P0 sono
chiusi. I P1 possono essere chiusi nei primi giorni post-live solo se c'e' una
mitigazione esplicita. I P2 sono miglioramenti, non bloccano il go-live.

## Stato atteso della produzione

Architettura target:

```text
Cliente
  -> Cloudflare DNS / proxy
  -> VPS
  -> Caddy reverse proxy HTTPS
  -> Next.js app container
  -> Postgres container
  -> Redis container
  -> backup sidecar verso S3/B2
```

Servizi esterni collegati:

- Stripe live mode per incasso acconto/full payment.
- Brevo per email transazionali.
- Cloudflare Turnstile per anti-spam/anti-bot.
- Bokun e canali charter quando le credenziali production sono pronte.
- Uptime monitor e, idealmente, Sentry.

## P0 — No-go assoluti

Se una voce di questa sezione non e' chiusa, non andare live.

### 1. Dominio e DNS pronti

Da fare:

- Spostare la gestione DNS da IONOS a Cloudflare tramite nameserver.
- Creare record `A` per `egadisailing.com` verso IP VPS.
- Creare record `CNAME` o `A` per `www.egadisailing.com`.
- Tenere TTL basso iniziale, ad esempio 300 secondi.
- Lasciare record MX IONOS se si vogliono mantenere le email IONOS.
- Configurare SPF in modo compatibile con IONOS + Brevo.
- Configurare DKIM Brevo.
- Configurare DMARC almeno in modalita' monitor: `p=none` all'inizio.

Accettazione:

- `dig egadisailing.com` ritorna l'IP della VPS.
- `dig www.egadisailing.com` risolve correttamente.
- MX continua a puntare al provider email scelto.
- Brevo mostra dominio/sender verificato.
- Invio test da Brevo arriva in inbox e non in spam.

Note:

- All'inizio usare Cloudflare proxy disattivato o comunque verificare bene
  Caddy/HTTPS prima di attivare la nuvola arancione.
- Non attivare HSTS aggressivo finche' HTTPS, redirect e `www` sono stabili.

### 2. VPS base sicura

Da fare:

- VPS con almeno 4 GB RAM, 2 vCPU, disco sufficiente per Postgres + backup
  locali temporanei.
- Creare utente deploy non-root, ad esempio `ubuntu` o `deploy`.
- Accesso SSH solo con chiave, password login disabilitato.
- Disabilitare login root SSH.
- Firewall attivo: consentire solo `22`, `80`, `443`.
- Installare Docker e Docker Compose v2.
- Attivare aggiornamenti security automatici.
- Attivare time sync/NTP.
- Aggiungere swap se VPS piccola.

Accettazione:

- `ssh deploy@IP` funziona con chiave.
- `ssh root@IP` non funziona.
- `ufw status` mostra solo porte necessarie.
- `docker compose version` funziona.
- `timedatectl` mostra clock sincronizzato.

### 3. Secrets production completi

Da fare:

- Creare `.env` production sulla VPS, mai committarlo.
- Generare secret forti per:
  - `POSTGRES_PASSWORD`
  - `REDIS_PASSWORD`
  - `NEXTAUTH_SECRET`
  - `CRON_SECRET`
  - `SEED_ADMIN_PASSWORD`
- Configurare:
  - `APP_URL=https://egadisailing.com`
  - `NEXTAUTH_URL=https://egadisailing.com`
  - `SERVER_ACTIONS_ALLOWED_ORIGINS=egadisailing.com,www.egadisailing.com`
  - Stripe live keys
  - Brevo production key
  - Turnstile production keys
  - `ADMIN_EMAIL=info@egadisailing.com`
  - `BREVO_SENDER_EMAIL=noreply@egadisailing.com`
  - `BREVO_REPLY_TO=info@egadisailing.com`

Accettazione:

- `docker compose -f docker-compose.prod.yml config` non mostra placeholder.
- L'app parte senza errori di env validation.
- `.env` non e' nel repo e non e' copiato dentro l'immagine Docker.

Note:

- Tenere una copia dei secret in un password manager.
- Dopo il primo login admin, rimuovere `SEED_ADMIN_PASSWORD` dalla VPS e
  riavviare app.

### 4. Deploy container production funzionante

Da fare:

- Clonare repo sulla VPS.
- Checkout `main`.
- Eseguire deploy con `docker-compose.prod.yml`.
- Verificare che `docker/entrypoint.sh` applichi `prisma migrate deploy`.
- Verificare Caddy e certificato HTTPS.

Accettazione:

- `docker compose -f docker-compose.prod.yml ps` mostra servizi healthy/up.
- `curl -I https://egadisailing.com` ritorna 200/3xx con TLS valido.
- `curl https://egadisailing.com/api/health` ritorna 200.
- Log app non mostrano errori Prisma/env/Redis all'avvio.

### 5. Database, migrazioni e seed

Da fare:

- Applicare tutte le migrazioni su DB production.
- Verificare presenza delle tabelle recenti, in particolare:
  - `Season`
  - `ServicePrice`
  - `EmailOutbox`
  - tabelle booking/payment/availability gia' esistenti
- Seedare catalogo, stagioni 2026 e prezzi.
- Creare admin iniziale.
- Verificare che i dati di pricing corrispondano al listino approvato.

Accettazione:

- `prisma migrate deploy` termina con successo.
- Admin login funziona.
- `/admin/prezzi` mostra matrice prezzi per stagione.
- La pagina prenotazioni mostra mezzi, esperienze, date e prezzi.
- `quotePrice()` non va in fallback legacy per le date 2026 configurate.

### 6. Backup reale e restore testato

Da fare:

- Configurare bucket S3/B2 per backup.
- Configurare env backup sidecar:
  - `BACKUP_S3_BUCKET`
  - `BACKUP_S3_ENDPOINT`
  - `BACKUP_S3_KEY`
  - `BACKUP_S3_SECRET`
  - `BACKUP_RETENTION_DAYS`
- Eseguire almeno un backup manuale prima del live.
- Fare restore del dump su DB separato o locale.

Accettazione:

- Backup manuale produce file nel bucket.
- Il dump si scarica e si ripristina senza errori.
- Dopo restore, query base su `Booking`, `Customer`, `Payment` funzionano.

No-go:

- Non andare live con backup "configurato ma mai testato". Il backup vale
  solo dopo un restore riuscito.

### 7. Stripe live configurato

Da fare:

- Completare KYC Stripe e IBAN.
- Inserire live keys in `.env`.
- Configurare webhook live:
  - `https://egadisailing.com/api/webhooks/stripe`
- Eventi minimi:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `charge.refunded`
- Salvare `STRIPE_WEBHOOK_SECRET`.
- Verificare che il checkout usi chiavi live solo in produzione.

Accettazione:

- Test pagamento live a importo minimo o booking interno controllato.
- Stripe dashboard mostra webhook 2xx.
- Booking passa da `PENDING` a `CONFIRMED`.
- `Payment` viene creato.
- Email conferma viene accodata in `EmailOutbox`.
- Nessun link saldo viene generato: saldo solo in loco.

### 8. Brevo production pronto

Da fare:

- Verificare dominio/sender Brevo.
- Configurare `noreply@egadisailing.com` come sender.
- Configurare `info@egadisailing.com` come reply-to/admin inbox.
- Testare invio cliente e admin.
- Verificare outbox e worker email.

Accettazione:

- Email conferma booking arriva al cliente.
- Email nuova prenotazione arriva ad admin.
- Auto-risposta contatti arriva al cliente.
- In dashboard admin il contatore "Email fallite" e' zero.
- `EmailOutbox.status` diventa `SENT` per i test.

### 9. GDPR/legal minimo pubblicato

Da fare:

- Pubblicare pagine:
  - `/privacy`
  - `/terms`
  - `/cookie-policy`
- Verificare link nel footer e nei template email.
- Verificare checkbox privacy/termini prima del pagamento.
- Verificare testo cancellation policy prima del pagamento.
- Verificare consenso registrato su booking.

Accettazione:

- L'utente non puo' pagare senza accettare privacy/termini.
- Il testo legale e' visibile prima del checkout.
- Le email includono footer legale e link.
- Admin puo' risalire a booking e consenso registrato.

No-go:

- Non andare live con pagine legal placeholder non approvate dal cliente.

### 10. Monitoraggio e alert

Da fare:

- Configurare uptime monitor esterno su:
  - `https://egadisailing.com/api/health`
- Configurare alert a email admin e possibilmente Telegram.
- Configurare Sentry o segnare formalmente come rischio accettato.
- Verificare `/api/health?deep=1` con `CRON_SECRET`.

Accettazione:

- Spegnendo temporaneamente app in staging/test, l'alert arriva.
- Health shallow ritorna 200.
- Health deep mostra DB, Redis, queue e canali.
- Log production sono consultabili con `docker compose logs`.

## P1 — Da chiudere prima possibile

Queste voci non dovrebbero bloccare un pilot controllato, ma vanno chiuse
entro pochi giorni dal live.

### 11. Staging o dry-run production-like

Da fare:

- Avere una VPS staging o almeno un deploy production-like su sottodominio.
- Usare Stripe test mode su staging.
- Usare Brevo test/sandbox o sender reale con destinatari interni.

Accettazione:

- Smoke test completo passa su ambiente simile alla prod.
- Le migration sono gia' state provate fuori dal laptop.

### 12. Cron verificati

Da fare:

- Verificare che il scheduler parta nel container app.
- Verificare cron principali:
  - pending booking GC
  - Stripe reconciliation
  - Bokun reconciliation
  - email outbox drain
  - balance/pre-departure reminders
  - retention

Accettazione:

- Log mostra "Cron scheduler started".
- Chiamata manuale con Bearer `CRON_SECRET` ritorna 200/207 atteso.
- Nessun cron usa `localhost` sbagliato dietro reverse proxy.

### 13. Bokun e canali esterni

Da fare:

- Inserire credenziali production Bokun.
- Configurare webhook Bokun verso VPS.
- Inserire credenziali Boataround se disponibili.
- Configurare IMAP per parser charter se si usa email parsing.
- Fare import simulato o controllato.

Accettazione:

- Nuova prenotazione Bokun crea booking nel DB.
- Disponibilita' viene propagata agli altri canali.
- Replay webhook non crea duplicati.
- Admin riceve una sola email su booking esterno creato.

Mitigazione se non pronto:

- Andare live solo con DIRECT booking e tenere integrazioni OTA disattivate.
- Usare admin manuale per bloccare date gia' vendute altrove.

### 14. Sicurezza HTTP

Da fare:

- Verificare header Caddy/Next:
  - HSTS, solo dopo HTTPS stabile
  - X-Frame-Options o CSP frame-ancestors
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
- Verificare redirect `http -> https`.
- Verificare redirect `www` deciso: canonical con o senza `www`.

Accettazione:

- `curl -I https://egadisailing.com` mostra header attesi.
- Nessun mixed content in browser console.
- Lighthouse non segnala problemi security banali.

### 15. Piano rollback

Da fare:

- Annotare commit attuale live.
- Sapere ultimo commit stabile precedente.
- Sapere come ripristinare dump DB.
- Sapere come disattivare temporaneamente checkout.

Accettazione:

- Esiste procedura scritta con comandi.
- E' stata provata almeno una volta su staging.
- Admin sa chi chiamare e in che ordine.

## P2 — Miglioramenti consigliati

### 16. Hardening operativo VPS

Da fare:

- Fail2ban o equivalente.
- Backup snapshot VPS giornaliero dal provider.
- Log rotation Docker.
- Metriche base CPU/RAM/disk.
- Alert disco sopra 80%.

Accettazione:

- `df -h` monitorato.
- Docker logs non possono saturare il disco.
- Snapshot provider visibile nella dashboard VPS.

### 17. CI/CD

Da fare:

- GitHub Actions con:
  - install
  - typecheck
  - test
  - build
- Deploy manuale protetto o scriptato.

Accettazione:

- `main` non viene deployato senza checks verdi.
- Il deploy e' ripetibile da runbook.

### 18. Runbook admin post-live

Da fare:

- Preparare mini-guida per admin:
  - come vedere prenotazioni
  - come cancellare/rimborsare
  - come leggere email fallite
  - come gestire richieste cambio data
  - come gestire conflitti OTA

Accettazione:

- Admin riesce a fare un booking test, cancellarlo e leggere ticket/email
  senza intervento tecnico.

## Smoke test finale pre-live

Eseguire questi test quando la VPS e' pronta, prima di aprire traffico reale.

### Test pubblico

- Aprire homepage.
- Compilare form rapido dalla home e verificare prefill su prenotazioni.
- Aprire pagina prenotazioni.
- Wizard:
  - scegli mezzo
  - scegli esperienza
  - scegli durata se presente
  - scegli ospiti
  - scegli data da calendario con prezzo visibile
  - inserisci dati cliente con telefono obbligatorio
  - scegli acconto 30% o full payment
  - visualizza disclaimer acconto non rimborsabile e saldo in loco
  - completa checkout

Accettazione:

- Booking creato.
- Pagamento registrato.
- Ticket visibile.
- Email cliente inviata.
- Email admin inviata.
- Disponibilita' aggiornata.

### Test admin

- Login admin.
- Dashboard carica.
- Calendario carica.
- Prenotazione test visibile.
- Prezzi e stagioni visibili.
- Dead-letter email assenti.
- Sync log senza alert non risolti.

### Test cron

- Chiamare health deep.
- Chiamare manualmente email outbox cron.
- Chiamare pending GC in ambiente controllato.
- Chiamare Stripe reconciliation in test/staging.

### Test recovery minimo

- Eseguire backup manuale.
- Scaricare dump.
- Ripristinare su DB separato.
- Verificare che il dump contenga booking test.

## Cutover day

Sequenza consigliata:

1. Freeze codice su `main`.
2. Verificare `npm run typecheck`, `npm test`, build production.
3. Abbassare TTL DNS a 300 se non gia' fatto.
4. Deploy su VPS.
5. Health check shallow e deep.
6. Eseguire smoke test con pagamento controllato.
7. Attivare Stripe live webhook.
8. Attivare Cloudflare proxy se desiderato.
9. Verificare `www`, canonical e sitemap.
10. Aprire traffico reale.
11. Monitorare per 2 ore.

## Prime 72 ore post-live

Ogni giorno controllare:

- Nuovi booking creati.
- Booking rimasti `PENDING` oltre 45 minuti.
- Pagamenti Stripe e booking DB allineati.
- `EmailOutbox` con status `FAILED`.
- Health deep.
- Backup giornaliero completato.
- Errori app nei log.
- Alert manuali per OTA.
- Disponibilita' su calendario admin.

Comandi utili:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs app --tail 200
curl -s https://egadisailing.com/api/health
curl -s -H "Authorization: Bearer $CRON_SECRET" https://egadisailing.com/api/health?deep=1
```

Query utili:

```sql
SELECT status, COUNT(*)
FROM "Booking"
GROUP BY status;

SELECT status, COUNT(*)
FROM "EmailOutbox"
GROUP BY status;

SELECT "templateKey", "recipientEmail", "lastError", "updatedAt"
FROM "EmailOutbox"
WHERE status = 'FAILED'
ORDER BY "updatedAt" DESC
LIMIT 20;

SELECT "confirmationCode", status, "createdAt"
FROM "Booking"
WHERE status = 'PENDING'
  AND "createdAt" < NOW() - INTERVAL '45 minutes'
ORDER BY "createdAt" ASC;
```

## Go / no-go finale

GO solo se:

- Tutti i P0 sono completati.
- Backup restore testato.
- Stripe live webhook testato.
- Brevo invia email cliente/admin.
- Health check passa.
- Admin riesce a gestire booking test.
- Legal copy pubblicata e approvata.
- Esiste una persona reperibile per le prime 72 ore.

NO-GO se:

- Non c'e' backup ripristinabile.
- Stripe live non e' verificato.
- Brevo non consegna.
- DNS/email non sono stabili.
- Le pagine legal sono mancanti o placeholder.
- Health deep mostra DB/Redis/queue rossi.
- Non c'e' piano rollback.
