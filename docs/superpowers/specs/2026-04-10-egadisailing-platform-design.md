# Egadisailing — Platform Design Spec

## Overview

Piattaforma web completa per **Egadisailing**, business di charter nautico luxury e accessibile con base a Trapani (Sicilia), specializzato in esperienze giornaliere e settimanali nelle Isole Egadi (Favignana, Levanzo, Marettimo).

**Obiettivo:** Sostituire la presenza online attuale (sito senza traffico, Bokun come sync tool a 600EUR/anno) con una piattaforma proprietaria che includa sito pubblico ottimizzato SEO, sistema di prenotazione diretto, dashboard admin completa e integrazioni con portali esterni.

**Dominio:** egadisailing.com
**Deploy:** VPS con Nginx come reverse proxy

---

## Servizi Offerti

### Trimarano

| Servizio | Capacita | Prezzo | Durata | Crew | Note |
|----------|----------|--------|--------|------|------|
| Social Boating | Max 20 pax | 120EUR (bassa) - 150EUR (alta) /pax | 8h | Skipper, Chef, Hostess | Min 11 paganti. Aperitivo + pranzo pesce incluso. Drink alcolici a pagamento a bordo |
| Exclusive Experience | Max 20 pax | Dinamico (da dashboard) | 8h | Skipper, Chef rinomato, Hostess | Menu raffinato. Drink a pagamento a bordo |
| Cabin Charter | Max 4 coppie (3 cabine) | 2.300EUR/cabina/settimana | 7 giorni | Skipper + crew | Prenotabile per singola cabina o intero trimarano |

### Barca

| Servizio | Capacita | Prezzo Giornata | Prezzo Mattina | Note |
|----------|----------|-----------------|----------------|------|
| Tour Condiviso | Max 12 pax | 75EUR (bassa) - 100EUR (alta) /pax | 60EUR (bassa) - 90EUR (alta) /pax | |
| Tour Esclusivo | Max 12 pax | 75EUR (bassa) - 100EUR (alta) /pax | 60EUR (bassa) - 90EUR (alta) /pax | Prezzo intero barca |

**Stagionalita:** Maggio (bassa) con incremento progressivo fino ad Agosto (alta). Anche Settembre e Ottobre operativi.

---

## Architettura

### Stack Tecnologico

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL con Prisma ORM
- **UI:** shadcn/ui + Tailwind CSS
- **i18n:** next-intl (25 lingue, routing `/[locale]/`)
- **Pagamenti:** Stripe
- **Email:** Brevo
- **Auth:** NextAuth.js (credenziali email/password)
- **Deploy:** Docker Compose (Next.js + PostgreSQL) su VPS, Nginx sulla VPS come reverse proxy centrale

### Struttura

```
                    +-------------+
                    |   Nginx     |
                    |  (reverse   |
                    |   proxy)    |
                    +------+------+
                           |
                    +------v------+
                    |  Next.js    |
                    |  App Router |
                    |-------------|
                    | /[locale]/  |  <-- Sito pubblico (25 lingue)
                    | /admin/     |  <-- Dashboard admin (protetta)
                    | /api/       |  <-- API routes interne
                    +------+------+
                           |
              +------------+------------+
              |            |            |
       +------v--+  +------v--+  +-----v-----+
       |PostgreSQL|  | Stripe  |  | Portali   |
       | (Prisma) |  |  API    |  | API sync  |
       +---------+  +---------+  +-----------+
```

### URL

- Sito pubblico: `egadisailing.com/it/`, `egadisailing.com/en/`, etc.
- Dashboard admin: `egadisailing.com/admin/` (login richiesto, non indicizzata)
- API: `egadisailing.com/api/*` (interne)

---

## Sito Pubblico

### Pagine

| Pagina | Descrizione |
|--------|-------------|
| **Homepage** | Hero video/immagine Egadi, presentazione servizi, CTA prenotazione, testimonial |
| **Trimarano Social Boating** | Descrizione, galleria, prezzi stagionali, calendario disponibilita, prenota |
| **Trimarano Exclusive** | Esperienza premium, chef, menu, galleria, prenota per gruppo |
| **Cabin Charter** | Esperienza settimanale, cabine, itinerario, prenota cabina o intero |
| **Boat Tour Condiviso** | Max 12 pax, prezzi giornata/mattina, prenota |
| **Boat Tour Esclusivo** | Barca esclusiva, prezzi, prenota |
| **Chi Siamo** | Storia, crew, valori, foto |
| **Contatti** | Form contatto, WhatsApp, mappa porto di Trapani |
| **FAQ** | Domande frequenti |

### Pagine di Dettaglio — Esperienze

Ogni servizio ha una pagina dettaglio con:

- **Hero** con galleria foto/video
- **Itinerario della giornata** — timeline visuale (es: partenza Trapani -> Favignana -> Cala Rossa -> pranzo a bordo -> Levanzo -> rientro)
- **Cosa include** — checklist visiva (pranzo chef, snorkeling, asciugamani, etc.)
- **Cosa portare** — crema solare, costume, etc.
- **Prezzi e stagionalita** — tabella dinamica per periodo
- **Calendario disponibilita** con CTA "Prenota ora"
- **Recensioni** — testimonial clienti
- **FAQ specifiche** dell'esperienza

### Pagine di Dettaglio — Barche

- **Scheda tecnica** — nome, tipo, lunghezza, anno, capacita max
- **Galleria fotografica** — interni, esterni, deck, cabine
- **Dotazioni** — doccia, frigo, casse audio, zona ombra, snorkeling gear, etc.
- **Crew associata** — presentazione skipper/chef/hostess con foto e bio
- **Mappa cabine** (cabin charter) — layout visuale 3 cabine
- **Servizi disponibili** — link ai servizi prenotabili su questa barca

### Pagine di Dettaglio — Isole

Pagina dedicata per Favignana, Levanzo, Marettimo:

- Descrizione, foto, punti di interesse (Cala Rossa, Grotta del Genovese, etc.)
- Quali esperienze toccano questa isola
- SEO: intercetta ricerche tipo "cosa vedere a Favignana dal mare"

Tutti i contenuti gestibili dalla dashboard admin.

### Flusso di Prenotazione

1. Utente sceglie servizio -> vede calendario con disponibilita
2. Seleziona data -> vede posti disponibili
3. Inserisce numero persone -> vede prezzo totale (dinamico per stagione)
4. Checkout con Stripe -> conferma via email
5. Social boating: biglietto individuale. Exclusive: prenotazione gruppo intero. Cabin charter: per cabina o intero.

### SEO

- Meta tag multilingua con `hreflang` su ogni pagina
- Structured data (schema.org `TourProduct`)
- Sitemap dinamica multilingua
- SSR/SSG per indicizzazione ottimale

---

## Dashboard Admin

**Accesso:** Login con credenziali (NextAuth.js). Possibilita di creare account staff con permessi limitati.

### Moduli

#### Calendario & Prenotazioni

- Vista calendario mensile/settimanale con tutte le uscite
- Ogni uscita mostra: servizio, barca, posti prenotati/disponibili, crew assegnata
- Click su uscita -> dettaglio con lista passeggeri, contatti, stato pagamento
- Aggiunta prenotazioni manuali (passaparola/telefono)
- Stati prenotazione: confermata, in attesa, cancellata, rimborsata

#### Sync Portali Esterni

- Integrazione con portali via API/iCal (vedi sezione Integrazioni)
- Quando arriva prenotazione da un portale -> aggiorna disponibilita su tutti gli altri
- Log di sincronizzazione con tracciamento errori
- Inserimento manuale prenotazioni da portali senza API

#### Dashboard Finanziaria

- Guadagno giornaliero, settimanale, mensile, stagionale
- Breakdown per servizio (social boating, exclusive, cabin charter, boat tour)
- Breakdown per canale (sito diretto, GetYourGuide, Airbnb, etc.)
- Commissioni portali evidenziate
- Export CSV/PDF per il commercialista

#### Gestione Prezzi Dinamica

- Tabella prezzi per servizio e per periodo stagionale
- Il proprietario definisce periodi con date esatte (es: 1 Mag - 31 Mag = bassa)
- Modifica prezzi dal pannello -> aggiornamento immediato sul sito
- Periodi completamente personalizzabili, anno per anno

#### Gestione Crew

- Anagrafica crew: skipper, chef, hostess
- Assegnazione crew alle uscite dal calendario
- Vista disponibilita crew

#### CRM Base

- Anagrafica clienti con storico prenotazioni
- Filtri: nazionalita, servizio prenotato, spesa totale, data ultima prenotazione
- Export contatti per campagne email future

Tutta la dashboard costruita con **shadcn/ui** (tabelle, form, calendar, dialog, charts).

---

## Modello Dati

### Entita Principali

| Entita | Campi Chiave |
|--------|-------------|
| **Service** | nome, tipo (social/exclusive/cabin/boat_shared/boat_exclusive), descrizione (multilingua), durata, capacita_max, min_paganti |
| **PricingPeriod** | servizio_id, data_inizio, data_fine, etichetta (bassa/media/alta/ferragosto), prezzo_per_persona |
| **Trip** | servizio_id, data, ora_partenza, ora_ritorno, stato (programmata/completata/cancellata), posti_disponibili |
| **Booking** | trip_id, cliente_id, num_persone, prezzo_totale, stato (confermata/attesa/cancellata/rimborsata), canale (sito/gyg/airbnb/clickandboat/manuale), stripe_payment_id |
| **Customer** | nome, email, telefono, nazionalita, lingua, note |
| **CrewMember** | nome, ruolo (skipper/chef/hostess), telefono, email |
| **TripCrew** | trip_id, crew_member_id |
| **PortalSync** | portale, ultimo_sync, stato, log_errori |
| **User** | email, password_hash, ruolo (admin/staff) |

### Relazioni

- Un **Service** ha molti **PricingPeriod** e molti **Trip**
- Un **Trip** ha molte **Booking** e molti **CrewMember** (via TripCrew)
- Una **Booking** appartiene a un **Customer** e a un **Trip**
- Il prezzo viene calcolato dal **PricingPeriod** attivo per la data del Trip

### Cabin Charter — Caso Speciale

- Trip copre 7 giorni
- Booking per cabina (max 3 cabine, 2 persone per cabina)
- Prenotabile per singola cabina o intero trimarano

---

## Integrazioni Esterne

### Stripe (Pagamenti)

- Checkout integrato per prenotazioni dirette
- Pagamento completo al momento della prenotazione
- Gestione rimborsi dalla dashboard (Stripe API)
- Webhook per aggiornamento stato pagamento in tempo reale

### Sync Portali — Tutte soluzioni gratuite

| Portale | Metodo | Costo | Effort |
|---------|--------|-------|--------|
| **GetYourGuide** | Supplier API — 6 endpoint REST (loro chiamano noi) | Gratis (commissione 20-30%) | Alto |
| **Viator / TripAdvisor** | Supplier API — ~5 endpoint REST | Gratis (commissione) | Alto |
| **Airbnb Experiences** | iCal export/import bidirezionale | Gratis | Basso |
| **Click&Boat** | Gestione manuale + possibile iCal | Gratis | Minimo |
| **Musement** | API push availability + webhooks prenotazioni | Gratis | Medio |
| **SamBoat** | iCal import one-way (nostro sistema -> SamBoat) | Gratis | Basso |

### Fasi di implementazione sync

- **Fase 1 (lancio):** iCal export -> sync Airbnb, SamBoat, Click&Boat. Inserimento manuale prenotazioni portali.
- **Fase 2 (post-lancio):** Supplier API per GetYourGuide e Viator (sync bidirezionale real-time).
- **Fase 3 (espansione):** Musement e altri portali.

**Risultato:** Bokun eliminato, 600EUR/anno risparmiati, controllo totale.

### Brevo (Email)

- **Email al cliente:** conferma prenotazione, reminder 24h prima, email post-esperienza (richiesta recensione)
- **Email al proprietario:** nuova prenotazione, cancellazione, alert sync fallita
- Piano gratuito: fino a 300 email/giorno

---

## Branding Kit

### Tone of Voice

**Luxury accessibile + Avventura & Natura + Mediterranean Lifestyle**

- Comunicazione calda, evocativa, mai formale o distante
- Si parla di "esperienza", "scoperta", "gusto" — non di "servizio" o "prodotto"
- Sofisticato per l'exclusive experience, conviviale e inclusivo per il social boating

**Esempi di copy:**
- Social Boating: *"Sali a bordo, il mare delle Egadi ti aspetta. Navigazione, tuffi in acque cristalline e pranzo di pesce fresco preparato dal nostro chef."*
- Exclusive: *"Un'esperienza riservata a te e ai tuoi ospiti. Chef rinomato, rotta personalizzata, lusso senza compromessi."*
- Cabin Charter: *"Una settimana tra Favignana, Levanzo e Marettimo. La tua casa e il mare."*

### Palette Colori

- **Blu profondo** — mare aperto, fiducia, premium
- **Turchese/azzurro** — acque delle Egadi, freschezza
- **Bianco sabbia** — pulizia, luxury, spiagge
- **Oro/ambra** — sole siciliano, accento premium
- **Corallo morbido** — calore mediterraneo, accento secondario

### Tipografia

- **Titoli:** Font serif elegante (es. Playfair Display) — luxury ma leggibile
- **Body:** Font sans-serif pulito (es. Inter o DM Sans) — moderno, ottima leggibilita web
- **Accenti/CTA:** Peso bold del body font

### Materiali Grafici

- Template post social (Instagram feed + stories)
- Template email transazionali (conferma, reminder)
- Biglietti da visita
- Materiali stampati (flyer per distribuzione porto/hotel)

---

## i18n — 25 Lingue

| # | Lingua | Codice | Area |
|---|--------|--------|------|
| 1 | Italiano | `it` | Base |
| 2 | Inglese | `en` | Internazionale |
| 3 | Tedesco | `de` | Germania, Austria |
| 4 | Francese | `fr` | Francia, Belgio, Svizzera |
| 5 | Spagnolo | `es` | Spagna, Sudamerica |
| 6 | Olandese | `nl` | Paesi Bassi, Belgio |
| 7 | Polacco | `pl` | Polonia |
| 8 | Svedese | `sv` | Svezia |
| 9 | Portoghese | `pt` | Portogallo, Brasile |
| 10 | Russo | `ru` | Russia |
| 11 | Cinese | `zh` | Cina |
| 12 | Giapponese | `ja` | Giappone |
| 13 | Ungherese | `hu` | Ungheria |
| 14 | Croato | `hr` | Croazia |
| 15 | Turco | `tr` | Turchia |
| 16 | Arabo | `ar` | Medio Oriente, Nord Africa |
| 17 | Greco | `el` | Grecia |
| 18 | Maltese | `mt` | Malta |
| 19 | Ceco | `cs` | Rep. Ceca |
| 20 | Danese | `da` | Danimarca |
| 21 | Norvegese | `no` | Norvegia |
| 22 | Finlandese | `fi` | Finlandia |
| 23 | Romeno | `ro` | Romania |
| 24 | Bulgaro | `bg` | Bulgaria |
| 25 | Serbo | `sr` | Serbia |

### Implementazione

- next-intl con routing `/[locale]/`
- File JSON per traduzioni UI statiche
- Contenuti dinamici (descrizioni, itinerari) con campo multilingua nel database, editabile da dashboard
- Lingua default: `it`, redirect automatico in base alla lingua del browser
- Supporto RTL per arabo
- Font CJK per cinese/giapponese
- Tag `hreflang` e sitemap multilingua per SEO
