# Piano Implementazione: Stagioni, Listino Prezzi e Checkout Egadisailing

## Summary

Creare un listino strutturato per stagioni e durata, allineare capacita' e prezzi al documento operativo, aggiornare wizard/calendario/checkout e lasciare un fallback temporaneo al vecchio `PricingPeriod` per ridurre il rischio in produzione.

Decisioni bloccate:

- Sconti bambini solo per esperienze a biglietti singoli, quindi `BOAT_SHARED`.
- Bassa tardiva sempre uguale alla bassa stagione.
- Fallback temporaneo: `quotePrice()` usa il nuovo listino; se manca una riga prova `PricingPeriod` solo come rete di sicurezza iniziale.

## Checklist Implementazione

- [x] Schema Prisma
  - [x] Aggiungere `Season` con `year`, `key`, `label`, `startDate`, `endDate`, `priceBucket`.
  - [x] Configurare `LATE_LOW.priceBucket = LOW`.
  - [x] Aggiungere `ServicePrice` con `serviceId`, `year`, `priceBucket?`, `durationDays?`, `amount`, `pricingUnit`.
  - [x] Aggiungere su `Booking`: `adultCount`, `childCount`, `freeChildSeatCount`, `infantCount`.

- [x] Seed/migrazione dati
  - [x] Gourmet capacita' `10`.
  - [x] Charter capacita' `6`.
  - [x] Disattivare varianti charter inattive `charter-3-days` ecc. dal flusso pubblico.
  - [x] Seed stagioni 2026:
    - LOW: 01/04-15/06
    - MID: 16/06-15/07
    - HIGH: 16/07-15/09
    - LATE_LOW: 16/09-31/10, bucket LOW
  - [x] Seed prezzi:
    - Gourmet: LOW 2000, MID 2200, HIGH 2500
    - Barca esclusiva 8h: LOW 900, MID 1050, HIGH 1200
    - Barca esclusiva 4h: LOW 630, MID 740, HIGH 840
    - Barca condivisa 8h: LOW 75, MID 85, HIGH 100
    - Barca condivisa 4h: LOW 55, MID 65, HIGH 75
    - Charter: 3=3250, 4=4300, 5=5400, 6=6450, 7=7500

- [x] Pricing core
  - [x] Riscrivere `quotePrice()` per trovare la stagione dalla data, risolvere `priceBucket`, leggere `ServicePrice`.
  - [x] Rimuovere la derivazione “4h = 75% del full day”.
  - [x] Usare `durationDays` e prezzo fisso per charter.
  - [x] Fallback temporaneo a `PricingPeriod` solo se non esiste `ServicePrice`.

- [x] Checkout e booking
  - [x] Cambiare input `/api/payment-intent`: da `numPeople` a `passengers`.
  - [x] Calcolare server-side adulti 10+, bambini 5-9, bambini 3-4, neonati 0-2.
  - [x] Salvare su `Booking` breakdown e `numPeople = posti occupati`.
  - [x] Applicare sconti solo a `BOAT_SHARED`; pacchetti privati/charter restano prezzo fisso.

- [x] Wizard e calendario
  - [x] Sostituire step “persone” con controlli separati per adulti/bambini/neonati.
  - [x] Mostrare posti occupati, paganti e totale stimato.
  - [x] Aggiornare `/api/booking-calendar` per usare nuovo pricing.
  - [x] Date senza prezzo nuovo ne' fallback legacy non selezionabili.

- [x] Admin
  - [x] Rifare `/admin/prezzi` come matrice listino.
  - [x] Colonne: Bassa, Media, Alta, Bassa tardiva.
  - [x] Bassa tardiva visibile ma read-only/mirror della bassa.
  - [x] Sezione separata Charter con righe 3-7 giorni.
  - [x] Aggiungere gestione stagioni per date annuali.
  - [x] Bloccare creazione nuovi `PricingPeriod` dall'admin; lasciarli solo come legacy/fallback temporaneo.

- [x] Cleanup pagine pubbliche
  - [x] Sostituire letture `pricingPeriods` in homepage, esperienze, prenota e landing con nuovo helper `getDisplayPrice()`.
  - [x] Aggiornare testi capacita': Gourmet max 10, Charter max 6.
  - [x] Aggiornare descrizioni charter: cambusa esclusa, hostess extra, refill/dispensa su richiesta.

## Test Plan

- Unit:
  - `quotePrice()` per ogni stagione e per bassa tardiva.
  - Charter 3-7 giorni con prezzo fisso.
  - Barca condivisa con adulti/bambini/neonati.
  - Pacchetti privati senza sconti eta'.
- Integration:
  - `POST /api/payment-intent` calcola totale corretto e salva breakdown.
  - Capacita': neonati 0-2 non occupano posto; bambini 3-9 si'.
  - Calendario mostra prezzo su date configurate e blocca date senza listino.
  - Fallback legacy funziona solo quando manca `ServicePrice`.
- Admin:
  - Salvataggio matrice prezzi.
  - Bassa tardiva segue automaticamente bassa.
  - Stagioni non possono sovrapporsi nello stesso anno.
- Regression:
  - `npm run typecheck`
  - lint mirato
  - `npm test`

## Assumptions

- Il primo anno da seedare e' 2026.
- Bassa tardiva non ha prezzi propri: usa sempre bucket LOW.
- Gli sconti eta' valgono solo per tour condivisi a persona.
- `PricingPeriod` resta per una fase di transizione, poi verra' rimosso in una PR successiva dopo verifica produzione.
