# Egadisailing — Integrazione Portali di Prenotazione

**A:** Cliente Egadisailing
**Da:** Team sviluppo
**Data:** 16 aprile 2026

---

## In due parole

L'obiettivo e far diventare il sito **egadisailing.com** il cuore di tutte le prenotazioni. Significa che:

- **Le persone prenotano e pagano direttamente sul sito** (con carta di credito tramite Stripe, senza commissioni di piattaforme terze)
- **Le prenotazioni che arrivano dai portali esterni** (Viator, Click&Boat, Airbnb, ecc.) vengono raccolte automaticamente nel nostro gestionale
- **La disponibilita del calendario si sincronizza** tra il sito e i portali dove possibile, in modo da non rischiare doppie prenotazioni

Non tutti i portali pero permettono la stessa cosa. Alcuni sono aperti e collaborativi, altri sono chiusi. Ecco come li dividiamo.

---

## I 3 gruppi di portali

### 🟢 Gruppo 1 — Integrazione completa automatica

Questi portali offrono uno strumento ufficiale e gratuito per collegarsi al nostro sito. Sincronizziamo **disponibilita, prezzi e prenotazioni** in tempo reale. Il personale non deve fare nulla manualmente: tutto viaggia automaticamente.

| Portale | Cosa riusciamo a fare | Cosa serve per partire |
|---|---|---|
| **Viator** (TripAdvisor) | Pubblicazione esperienze, calendario, prenotazioni | Richiedere l'accesso ufficiale (gratuito, ~1-2 settimane di attesa) |
| **Boataround** | Pubblicazione charter, calendario, prenotazioni | Richiedere l'accesso ufficiale (gratuito, ~1 settimana) |
| **FareHarbor** | Pubblicazione esperienze e prenotazioni | Accordo come rivenditore (gratuito, poche settimane) |

Per questi portali, la procedura è:
1. Mandiamo una mail ufficiale per richiedere l'accesso a nome Egadisailing
2. Loro approvano e ci danno le "chiavi" di accesso
3. Noi configuriamo il collegamento nel sito
4. Da quel momento tutto funziona automaticamente

---

### 🟡 Gruppo 2 — Integrazione parziale (solo calendario)

Questi portali permettono di sincronizzare **solo il calendario di disponibilita** ma non i prezzi. Il vantaggio: se uno prenota sul nostro sito, quel giorno risulta automaticamente occupato anche sul loro portale (e viceversa), cosi si evita il rischio di doppia prenotazione.

Le prenotazioni vere e proprie che arrivano da questi portali vengono raccolte via **email** (ogni portale manda una mail di conferma quando prenota qualcuno): un nostro programma legge quelle mail automaticamente e crea la prenotazione nel gestionale.

| Portale | Cosa riusciamo a fare | Cosa serve per partire |
|---|---|---|
| **SamBoat** | Sync calendario automatico (aggiornamento ogni ora) + cattura prenotazioni da email | Accesso al pannello SamBoat del cliente, 15 minuti di configurazione |
| **Airbnb (Case)** | Sync calendario + cattura prenotazioni da email | Accesso pannello Airbnb, 15 minuti |
| **Boatsetter** | Sync calendario + email | Accesso pannello Boatsetter |
| **Click&Boat** | Probabile — da verificare dal pannello | Accesso pannello Click&Boat, 15 minuti per verificare |
| **Nautal** | Probabile — da verificare dal pannello | Accesso pannello Nautal, 15 minuti per verificare |

**Nota importante**: per Click&Boat e Nautal non e confermato ufficialmente che supportino la sincronizzazione calendario. Appena avremo accesso al pannello del cliente verifichiamo in 15 minuti.

---

### 🔴 Gruppo 3 — Nessuna integrazione possibile (scelta del portale)

Questi portali **non permettono nessun tipo di collegamento automatico** con sistemi esterni a meno di pagare un aggregatore a pagamento (come Booking Manager, NauSYS, MMK), che pero costa parecchio e abbiamo escluso per contenere i costi.

Questo NON e un limite del nostro sito: e una scelta commerciale di questi portali, che tengono i loro dati chiusi per obbligare gli operatori ad usare i loro pannelli.

| Portale | Perche non si puo integrare | Cosa faremo |
|---|---|---|
| **Airbnb Experiences** | Airbnb offre il collegamento automatico solo per le case, non per le esperienze. Non hanno API pubblica per le esperienze. | Gestione manuale — ma il nostro gestionale raccoglie comunque le prenotazioni dalle email di conferma Airbnb |
| **Sailo** | Non offrono nessuna API pubblica, solo tramite aggregatori a pagamento | Gestione manuale + cattura da email |
| **Musement (TUI)** | Hanno l'API ma richiedono un **contratto commerciale** con TUI (che e una grossa azienda) | Rimandato — valutabile in futuro se il volume lo giustifica |
| **GetMyBoat** | Principalmente USA, API solo su richiesta | Rimandato (poco usato in Italia) |

**Cosa significa in pratica per questi portali:**
- Quando qualcuno prenota da li, arriva una email di conferma
- Il nostro programma legge la email e crea la prenotazione nel gestionale
- La disponibilita sul sito si aggiorna di conseguenza
- Pero la disponibilita dell'altro portale deve essere aggiornata manualmente dal pannello Airbnb/Sailo/ecc

**Mitigazione**: il gestionale avra un "pannello di allerta" che ogni mattina dice "oggi hai prenotazioni su Airbnb Experiences per queste date — vai a bloccare la disponibilita su X e Y".

---

### ⚠️ Caso speciale — GetYourGuide

GetYourGuide e un portale grosso e potenzialmente utile, **ma ha un requisito particolare**: per poter usare la loro API serve avere **almeno 100.000 visite al mese** sul sito. E un requisito pensato per partner grandi.

Strategia:
- **Oggi**: pubblichiamo le esperienze manualmente sul pannello GetYourGuide, gestiamo le prenotazioni via email
- **Quando il sito cresce**: una volta raggiunte le 100k visite mensili attiviamo l'API e diventa completamente automatico

---

## Il pagamento — Stripe

Tutte le prenotazioni che arrivano **dal sito egadisailing.com** vengono pagate direttamente con carta di credito tramite **Stripe**, un servizio di pagamento professionale usato da migliaia di aziende.

Cosa comporta:
- La carta del cliente non passa dal sito egadisailing (per sicurezza) ma direttamente da Stripe
- Stripe verifica la carta, gestisce i pagamenti 3D Secure (sicurezza aggiuntiva), e ci accredita i soldi su un conto corrente Egadisailing
- Commissione Stripe tipica: 1,4% + 25 centesimi per transazione europea
- **Nessun intermediario**: il 98,6% dell'incasso arriva direttamente a Egadisailing (meno le commissioni Stripe)
- Rimborsi gestibili con un click dal gestionale

Quando invece la prenotazione arriva da un portale terzo (Viator, Click&Boat, ecc.), il pagamento e gia gestito dal portale e la commissione e regolata dall'accordo con loro.

---

## Cosa significa per l'azienda nella pratica quotidiana

### 🌅 La mattina apri il gestionale
Vedi il calendario unificato: tutte le prenotazioni di tutti i canali in un'unica pagina. Colori diversi per distinguere il canale.

### 📥 Nuova prenotazione da un portale
- **Automatica** (Viator, Boataround, Stripe): appare nel gestionale in tempo reale, conferma al cliente, disponibilita aggiornata ovunque
- **Quasi-automatica** (SamBoat, Airbnb Case, ecc. via email): appare nel gestionale entro pochi secondi dall'arrivo della email

### ⚠️ Prenotazione da un portale "manuale" (Airbnb Experiences, Sailo)
- Il gestionale raccoglie comunque la prenotazione dalla email
- Ti mostra un'allerta: "Bloccare anche la disponibilita sugli altri portali per queste date"
- Ci cliccki sopra e ti compaiono i link diretti ai pannelli dei portali interessati

### 📊 A fine mese
Il gestionale ti fa il report: quante prenotazioni per canale, quanto hai incassato netto, quanto di commissioni hai pagato a ciascun portale, quali canali rendono di piu.

---

## Cosa ci serve da te per partire

Per mettere in moto la Fase 1 (sito proprietario + Stripe) basta:

1. **Account Stripe di Egadisailing**
   - Se gia esiste, ci servono le credenziali test + live
   - Se non esiste, registrazione gratuita in 1 ora su stripe.com con dati aziendali, IBAN, documenti identita

2. **Lista dei portali attualmente usati** da Egadisailing
   - Per concentrare gli sforzi sui portali reali, non su tutti quelli disponibili

3. **Accesso ai pannelli dei portali** (per verificare la sincronizzazione iCal)
   - Almeno Click&Boat e Nautal (15 minuti a portale)

4. **Una email dedicata** per ricevere le conferme dei portali (es. `bookings@egadisailing.com`)
   - Possiamo crearla noi se hai il dominio gestito

### Azioni in parallelo (mentre sviluppiamo)

Facciamo partire **subito** le richieste di accesso a Viator e Boataround (gratis, solo da scrivere una mail). Ci mettono 1-2 settimane a rispondere: quando sviluppiamo il sito, le credenziali arrivano giusto in tempo per la Fase 2.

---

## Tempi stimati

| Fase | Cosa diventa operativo | Tempi |
|---|---|---|
| **Fase 1** | Sito che prende prenotazioni direttamente + pagamenti Stripe + gestionale | 2-3 settimane |
| **Fase 2** | Sincronizzazione calendario con SamBoat, Airbnb Case, ecc. + cattura email dagli altri portali | +1 settimana |
| **Fase 3** | Integrazione completa Viator e Boataround | +2-3 settimane (dipende dai tempi di risposta loro) |
| **Fase 4** | Eventuali estensioni (GetYourGuide, Musement, ecc.) | Dopo il lancio, su necessita |

---

## Domande da chiarire insieme

Per non dimenticare nulla, mi servirebbero risposte su:

1. Su quali portali state gia vendendo oggi? (cosi concentriamo gli sforzi)
2. Avete gia un account Stripe aziendale?
3. Avete gia rapporti con un account manager di Viator, Click&Boat, o altri? (magari hanno gia dato credenziali prima)
4. Il sito va in italiano + inglese + euro, giusto?
5. La politica di rimborso/cancellazione e la stessa per tutti i canali o varia?
6. Vi interessa tracciare le commissioni per canale per la parte fiscale/finanziaria?
7. Quante prenotazioni gestite in media al mese? (per dimensionare correttamente il sistema)

---

## In sintesi

- ✅ **Si puo fare tutto quello che e tecnicamente possibile** senza pagare aggregatori
- ✅ **Integrazione automatica** completa su: Viator, Boataround, FareHarbor, Stripe
- ✅ **Integrazione parziale** (calendario + email) su: SamBoat, Airbnb Case, Boatsetter, probabilmente Click&Boat e Nautal
- ⚠️ **Gestione manuale accelerata** su: Airbnb Experiences, Sailo, Musement (non dipende da noi ma dalle loro scelte)
- 🚀 **Possiamo partire subito** con il sito + Stripe, anche prima di avere tutte le integrazioni esterne

Per qualsiasi dubbio o domanda sono a disposizione.
