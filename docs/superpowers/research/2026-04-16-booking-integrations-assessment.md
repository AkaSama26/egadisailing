# Booking Integrations — Feasibility Assessment

**Data:** 2026-04-16
**Obiettivo:** capire quali portali terzi si possono integrare **senza aggregatori a pagamento** (no MMK/NauSYS/Booking Manager), cosa possiamo fare subito, cosa richiede partnership, cosa resta manuale.

---

## 1. Executive summary

### Cosa otteniamo "a costo zero" combinando API + iCal + Email parsing

| Direzione | Cosa funziona automaticamente | Cosa resta manuale |
|---|---|---|
| **Ingestion** (prenotazioni OTA → nostro DB) | Email parsing + webhook API + iCal polling | Solo Airbnb Experiences e canali chiusi |
| **Export** (disponibilita/prezzi nostri → OTA) | API REST (Viator, GYG, Boataround, Musement), iCal (SamBoat, Airbnb Homes, Boatsetter) | Click&Boat, Nautal, Sailo (admin UI accelerato) |
| **Pagamenti** | Stripe embedded sul sito proprietario | — |

### I "dealbreaker" da sapere subito

1. **GetYourGuide richiede 100k visite mensili** per accesso API — il cliente probabilmente non li ha ancora
2. **Airbnb Experiences** non ha ne API ne iCal — solo manuale
3. **Sailo** non ha API pubblica — solo manuale
4. **Viator Supplier API e Boataround Partner API** sono gratis e disponibili a tutti — sono le nostre vittorie facili
5. **Musement** ha API pubblica documentata ma richiede contratto commerciale

---

## 2. Platform-by-platform assessment

### Legenda
- ✅ Pronto — docs pubbliche, nessun requisito particolare
- 🟡 Serve partnership — API esiste ma richiede approvazione
- ⚠️ Solo iCal — disponibilita si, ma no sync prezzi
- ❌ Bloccato — nessuna opzione automatica senza aggregatore
- 📧 Email only — integrazione via parsing email di conferma

### 2.1 Viator (TripAdvisor Experiences)

| Aspetto | Stato | Dettagli |
|---|---|---|
| API REST | ✅ Disponibile | Supplier API + Merchant API, con sandbox |
| Docs | ✅ Complete | [docs.viator.com/supplier-api](https://docs.viator.com/supplier-api/technical/) |
| Credenziali | 🟡 Serve signup | `partners.viator@viator.com` + modulo distribution partners |
| Requisiti traffico | ✅ Nessuno | Aperto a tutti gli operatori |
| Capability | ✅ Availability, pricing, booking ingestion, cancellation, webhooks |
| Commissioni | Commission-based (~20-25% tipicamente) |
| **Priorita** | **Alta — prima integrazione da fare** |

**Cosa manca per partire:** solo la richiesta credenziali + supplier ID. Sandbox gia pronto.

---

### 2.2 GetYourGuide

| Aspetto | Stato | Dettagli |
|---|---|---|
| API REST | ✅ Disponibile (4 tier) | Supplier API con OpenAPI spec pubblica |
| Docs | ✅ Complete | [integrator.getyourguide.com](https://integrator.getyourguide.com/documentation/overview), [GitHub](https://github.com/getyourguide/partner-api-spec) |
| Credenziali | 🟡 Serve signup | Contatto via partner.getyourguide.com |
| Requisiti traffico | ❌ **100k visite mensili** per Basic access | **Probabile blocker iniziale** |
| Capability | Availability sync, booking ingestion, deals management, webhooks |
| **Priorita** | **Media — utile ma probabilmente non disponibile al lancio** |

**Cosa manca per partire:** verificare se esistono tier senza requisito traffico; in alternativa, listare manualmente + aggiungere API quando arriva il traffico.

---

### 2.3 Boataround

| Aspetto | Stato | Dettagli |
|---|---|---|
| API REST | ✅ Disponibile | Partner API + Public API + User API separati |
| Docs | ✅ Complete | [partner-api.boataround.com](https://partner-api.boataround.com/), [GitHub docs](https://github.com/Boataround/api-documentation) |
| Credenziali | 🟡 Serve signup | `info@boataround.com` per token |
| Requisiti traffico | ✅ Nessuno noto |
| Capability | ✅ Availability push, booking ingestion, pricing, webhooks |
| **Priorita** | **Alta — copre charter settimanale** |

**Cosa manca per partire:** richiesta token a info@boataround.com + partner account.

---

### 2.4 Musement (TUI group)

| Aspetto | Stato | Dettagli |
|---|---|---|
| API REST | 🟡 Documentata ma serve contratto | [partner-api.musement.com](https://partner-api.musement.com/api/getting-started) |
| Credenziali | 🟡 Serve business contract | `business@musement.com` |
| Tipo integrazione | Full (pagamento via Musement) o Partial (search only) |
| Capability | Availability, cart, order, booking status |
| **Priorita** | **Bassa — utile ma commercialmente piu impegnativo** |

**Cosa manca per partire:** negoziazione contratto commerciale con TUI/Musement.

---

### 2.5 FareHarbor (Booking.com family)

| Aspetto | Stato | Dettagli |
|---|---|---|
| API REST | ✅ Disponibile | External API v1 |
| Docs | ✅ Complete | [developer.fareharbor.com](https://developer.fareharbor.com/api/external/v1/) |
| Webhook | ✅ Booking + Item events |
| Credenziali | 🟡 Serve reseller agreement |
| Capability | Live availability, create bookings, webhook events |
| **Priorita** | **Bassa — utile ma meno traffico in Italia** |

---

### 2.6 GetMyBoat

| Aspetto | Stato | Dettagli |
|---|---|---|
| API | 🟡 On request | Partnership richiesta |
| iCal | ✅ Calendar proprietario + integrazione Google/Apple |
| Docs | Parziali | [getmyboat.zendesk.com](https://getmyboat.zendesk.com/hc/en-us/articles/23826280540059-Calendar-Integration-with-Getmyboat) |
| **Priorita** | **Bassa — USA-focused** |

---

### 2.7 SamBoat

| Aspetto | Stato | Dettagli |
|---|---|---|
| API | ❌ Non pubblica | Nessuna API REST |
| iCal | ⚠️ Solo import (noi → loro) | Aggiornamento ogni ora |
| Docs iCal | ✅ [SamBoat help iCal](https://www.samboat.com/help/how-does-the-import-of-external-calendars-work-164) |
| Direzione | Solo export del nostro calendario verso SamBoat (blocca disponibilita) |
| Capability | Noi esponiamo iCal dal nostro server, SamBoat lo legge ogni ora |
| Ingestion booking | 📧 **Email parsing** delle email di conferma SamBoat |
| **Priorita** | **Alta** — mercato EU grosso, setup semplice |

**Cosa manca per partire:** creare endpoint iCal sul nostro server + configurare nel dashboard SamBoat + setup email parser.

---

### 2.8 Click&Boat

| Aspetto | Stato | Dettagli |
|---|---|---|
| API | ❌ Non pubblica (solo via Digital Nautic = aggregatore) |
| iCal | ⚠️ Probabile — non trovata doc pubblica, serve verifica dashboard proprietario |
| Help center | [help.clickandboat.com](https://help.clickandboat.com/) |
| Ingestion booking | 📧 Email parsing |
| **Priorita** | **Media** — verificare iCal dal loro dashboard |

**Cosa manca per partire:** login al loro owner dashboard per verificare presenza export/import iCal + setup email parser.

---

### 2.9 Nautal

| Aspetto | Stato | Dettagli |
|---|---|---|
| API | ❌ Non pubblica |
| iCal | ⚠️ Non verificato — serve conferma dal loro owner panel |
| Ingestion booking | 📧 Email parsing |
| **Priorita** | **Bassa-Media** |

---

### 2.10 Sailo

| Aspetto | Stato | Dettagli |
|---|---|---|
| API | ❌ Solo via Booking Manager (aggregatore a pagamento — escluso) |
| iCal | ❌ Non conosciuto |
| **Priorita** | **Bassa — manuale via admin UI accelerato** |

---

### 2.11 Airbnb Experiences

| Aspetto | Stato | Dettagli |
|---|---|---|
| API pubblica | ❌ No per Experiences |
| iCal | ❌ No per Experiences (solo Airbnb Homes ce l'ha) |
| Host API (riservata) | 🟡 Solo partner approvati con volume enorme |
| Ingestion booking | 📧 Email parsing (Airbnb manda email strutturate) |
| **Priorita** | **Manuale — admin UI accelerato** |

---

### 2.12 Boatsetter

| Aspetto | Stato | Dettagli |
|---|---|---|
| API | ❌ Non pubblica |
| iCal | ✅ Export calendario supportato |
| Docs | [support.boatsetter.com export-calendars](https://support.boatsetter.com/en_us/exporting-calendars-rycfUkshs) |
| **Priorita** | **Bassa — USA-focused** |

---

## 3. Summary matrix

| Portale | API REST | iCal | Email | Priorita | Credenziali note |
|---|---|---|---|---|---|
| **Viator** | ✅ Gratis | — | — | 🔴 ALTA | `partners.viator@viator.com` |
| **Boataround** | ✅ Gratis | — | — | 🔴 ALTA | `info@boataround.com` |
| **SamBoat** | — | ⚠️ Solo import | 📧 | 🔴 ALTA | Dashboard proprietario |
| **Click&Boat** | — | ⚠️ Da verificare | 📧 | 🟡 MEDIA | Dashboard proprietario |
| **GetYourGuide** | ✅ (100k req.) | — | — | 🟡 MEDIA | `partner.getyourguide.com` |
| **Nautal** | — | ⚠️ Da verificare | 📧 | 🟡 MEDIA | Dashboard proprietario |
| **Musement** | 🟡 Contratto | — | — | 🟢 BASSA | `business@musement.com` |
| **FareHarbor** | ✅ | — | — | 🟢 BASSA | Reseller agreement |
| **Airbnb Experiences** | — | — | 📧 | 🟢 BASSA | Admin manuale |
| **Sailo** | — | — | 📧 | 🟢 BASSA | Admin manuale |
| **GetMyBoat** | 🟡 Request | ⚠️ | — | 🟢 BASSA | Richiesta specifica |
| **Boatsetter** | — | ⚠️ | — | 🟢 BASSA | Dashboard |

---

## 4. Cosa possiamo costruire SUBITO (senza aspettare nessuno)

Questi pezzi dipendono **solo da noi** e funzionano a prescindere dalle partnership:

1. **Sistema di prenotazioni sul sito proprietario**
   - `BookingSearch` funzionante (oggi e solo UI)
   - Motore availability, pricing stagionale, checkout
   - **Stripe embedded** per i pagamenti

2. **Admin UI "booking hub"**
   - Calendario unificato con tutti i canali
   - Inserimento rapido manuale (hotkey, bulk)
   - Stato sincronizzazione per portale (ultimo poll, ultimo push)

3. **Endpoint iCal di export**
   - `GET /api/ical/:boatId.ics` che restituisce un calendario con blocchi per ogni prenotazione
   - Si configura in SamBoat, Airbnb Homes, Boatsetter, e ovunque supportato

4. **Email parser**
   - Indirizzo dedicato `bookings@egadisailing.com` (via IMAP o forward webhook)
   - Parser dedicato per formato email di: Viator, GetYourGuide, Airbnb Homes, Booking.com, SamBoat, Click&Boat, Nautal
   - Template per riconoscere: guest, data, numero persone, prezzo, channel

5. **Channel adapter architecture**
   - Interfaccia comune `ChannelAdapter` con metodi: `pushAvailability()`, `fetchBookings()`, `cancelBooking()`
   - Implementazioni: `ViatorAdapter`, `BoataroundAdapter`, `ICalExportAdapter`, `EmailAdapter`, `ManualAdapter`

6. **Webhook receiver**
   - `POST /api/webhooks/:channel` per ricevere eventi dai portali con webhook (Viator, GetYourGuide, Boataround, FareHarbor)

7. **Reconciliation daemon**
   - Job schedulato che confronta le prenotazioni tra sistemi e segnala incongruenze

**Tempo stimato**: 2-3 settimane di lavoro per la base funzionante (sito + Stripe + iCal export + email ingestion di base).

---

## 5. Cosa dipende da terzi (serve azione del cliente)

Azioni che il cliente deve fare o che richiedono risposta esterna:

| # | Azione | Da chi | Tempo atteso |
|---|---|---|---|
| 1 | Richiesta Supplier API a Viator | `partners.viator@viator.com` | 1-2 settimane |
| 2 | Richiesta Partner API a Boataround | `info@boataround.com` | 1 settimana |
| 3 | Valutazione GYG (check traffico) | Noi + cliente | - |
| 4 | Verifica iCal export su Click&Boat dashboard | Cliente (login propria) | 15 minuti |
| 5 | Verifica iCal export su Nautal dashboard | Cliente (login propria) | 15 minuti |
| 6 | Setup email dedicata `bookings@egadisailing.com` + forward da account portali | Cliente (admin email) | 1 giorno |
| 7 | Eventuale negoziazione contratto Musement | `business@musement.com` | settimane |
| 8 | Account Stripe del cliente + dati aziendali | Cliente (iscrizione Stripe) | 1 giorno |

---

## 6. Proposta di fasi

### Fase 1 — Sito proprietario funzionante (settimane 1-3)
**Obiettivo:** la gente prenota direttamente su egadisailing.com e paga.

- Motore prenotazioni: disponibilita, pricing stagionale, cart, checkout
- Stripe integration con Embedded Checkout
- Webhook Stripe per conferma ordine
- Admin booking management (gia esistente, da completare)
- Email transazionali (conferma, reminder, cancellazione)

**Vincolo esterno**: solo account Stripe del cliente (1 giorno).

### Fase 2 — iCal export + Email ingestion (settimane 3-4)
**Obiettivo:** sincronizzare disponibilita con SamBoat/Airbnb Homes/ecc + raccogliere prenotazioni OTA via email.

- Endpoint `/api/ical/:serviceId.ics`
- Admin per configurare iCal URL su ogni portale
- IMAP/SMTP ingestion con parser per i principali OTA
- Admin UI "inbox" per prenotazioni arrivate via email (approve/edit)

**Vincolo esterno**: email dedicata + forward (1 giorno cliente).

### Fase 3 — API integrations (settimane 5-8, dipende da credenziali)
**Obiettivo:** sync real-time con Viator e Boataround.

- ChannelAdapter interface
- ViatorAdapter (sandbox → prod)
- BoataroundAdapter
- Webhook receiver
- Reconciliation daemon

**Vincolo esterno**: attesa credenziali Viator e Boataround (1-2 settimane).

### Fase 4 — Estensioni (dopo lancio)
- GetYourGuide (se/quando il traffico lo permette)
- Musement (se/quando si chiude contratto)
- FareHarbor, Sailo, ecc. on-demand

---

## 7. Open questions per il cliente

Prima di iniziare, servono risposte chiare su:

1. **Quali portali sta gia usando oggi il cliente?** Solo quelli attivi devono essere prioritari.
2. **Account Stripe esiste gia?** Dati aziendali pronti?
3. **Il cliente ha rapporti commerciali pregressi con Viator/Click&Boat/ecc.?** Magari ha gia credenziali o un account manager.
4. **Lingua/valute**: italiano + inglese + EUR e sufficiente per ora?
5. **Cancellazioni e rimborsi**: qual e la policy? Deve essere applicata anche ai canali OTA o ogni canale ha la propria?
6. **Commissioni**: il cliente vuole tracciare le commissioni per canale (per reportistica finanziaria)?
7. **Pagamento Stripe solo sul sito proprietario, o anche proxy per altri canali?** (Solo sito, tipicamente)
8. **Prenotazioni overlap**: se un tour e "social boating" con 12 posti e un canale vende 5 posti e un altro canale vende 10 posti, il sistema deve fare oversell detection?

---

## 8. Conclusioni operative

**Possiamo partire oggi con Fase 1 senza dipendere da nessuno.**

Serve dal cliente:
- Account Stripe
- Conferma lista portali gia attivi
- Risposte alle 8 open questions sopra

In parallelo, mandiamo email a Viator e Boataround per ottenere credenziali in anticipo — mentre sviluppiamo la Fase 1 loro rispondono, arriviamo alla Fase 3 con tutto pronto.

**La scelta architetturale chiave**: costruire il sistema attorno a un'interfaccia `ChannelAdapter` astratta, cosi aggiungere un nuovo portale domani e solo scrivere un nuovo adapter senza toccare il core.
