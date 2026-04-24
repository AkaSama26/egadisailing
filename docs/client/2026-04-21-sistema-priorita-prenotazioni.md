# Sistema di priorità nelle prenotazioni — proposta

**Documento per discussione con la proprietà — versione finale post-brainstorm.**

Data: 21 aprile 2026 · Aggiornato: 23 aprile 2026 (decisioni finali)

---

## 1. Il problema che vogliamo risolvere

Oggi il calendario prenotazioni tratta tutte le esperienze nello stesso modo:
"prima prenotato = prima servito". Se un cliente prenota un **tour giornaliero
condiviso** da 120€ a persona per domenica 10 agosto, quella data diventa
**non più vendibile** per un **Gourmet** da 2000€ o un **Charter** da 7500€.

Una domenica "bloccata" da un piccolo gruppo può valere molto di più venduta
come Gourmet o Charter. Stima perdita conservativa: **€30-40.000/anno** in
alta stagione.

**L'idea**: introdurre un sistema di priorità basato sul **valore economico**
della prenotazione. Se arriva una richiesta che vale più di quella già
presente, il sistema permette (con controllo admin) di sovrascriverla.

---

## 2. La regola fondamentale in 3 righe

1. **Più paga, prima vince**: confrontiamo quanto fattura il booking esistente
   vs quanto fatturerà il nuovo.
2. **15 giorni dalla data = linea rossa**: oltre quella soglia, nessun override
   possibile. Il cliente ormai vicino alla data è protetto.
3. **Admin decide sempre**: il sistema non cancella mai nulla da solo — mostra
   richieste, admin clicca Approva/Rifiuta.

---

## 3. I 3 pacchetti attuali (post-decisione brainstorm)

| Pacchetto | Durata | Capacità | Prezzo base |
|---|---|---|---|
| **Gourmet** | 1 giorno intero | 8-10 persone | 2.000€ (bassa) / ~3.000€ (alta) |
| **Charter** | 3-7 giorni | 6 persone | 7.500€/settimana |
| **Giornaliero Social** | 1 giorno | 11-20 persone | 120-150€/persona |

> **Cabin Charter rimosso dal catalogo** — operativamente problematico: prenota
> una settimana senza garantire che tutte le 3 cabine vengano poi vendute,
> spina nel fianco per gestione operativa e revenue non prevedibile.
> Gourmet e Charter restano venduti come "barca intera = 1 cliente = 1
> pagamento".

Esempi di fatturato:

- Gourmet tipico bassa stagione: **~2.000€**
- Gourmet tipico alta stagione: **~3.000€**
- Charter 7 giorni: **7.500€**
- Social 1 giorno con 15 pax: **~1.950€**
- Social 1 giorno con 20 pax: **~3.000€**

---

## 4. Come funzionerà per il cliente sul sito

**Timing nuovo (decisione brainstorm 2026-04-23)**: il check sulla disponibilità
avanzata **non** avviene al "Conferma e paga" finale, ma al click **"Continua"**
dopo aver scelto il numero persone. Questo evita che il cliente compili tutto
e inserisca la carta solo per scoprire alla fine che la data non è
disponibile.

### Scenario: Laura visita il sito il 25 luglio, vuole Gourmet per il 10 agosto

**Step 1** — Laura clicca "Gourmet" e sceglie il 10 agosto dal calendario.

**Step 2** — Seleziona 9 persone, clicca **"Continua"**.

**Step 3** — Spinner mentre il sistema controlla:
> C'è una prenotazione su questa data? Se sì, quanto vale?
> Siamo a più di 15 giorni dalla data?

A seconda del risultato, succede uno di questi 4 casi.

### ✓ Caso A — Data libera

Wizard prosegue a customer info → pagamento. Laura vede il classico
"Prenotazione confermata!".

### ✓ Caso B — Override possibile (data occupata da booking minore)

Esistente: Social 10 agosto, 8 persone, **€960**.
Nuovo: Laura Gourmet 9 persone, **€2.250**.

Revenue nuovo > esistente + 16 giorni > 15 → override eligibile.

Laura **prosegue normalmente** a customer info e pagamento (non sa di essere
in override — il sistema è trasparente). Al completamento vede:

> **Prenotazione ricevuta**
>
> La tua prenotazione è in attesa di conferma entro 24-72 ore.
> Riceverai email di conferma o eventuale rimborso.

Admin riceve alert dashboard:
> Nuova richiesta override: Laura (Gourmet €2.250) su 10 agosto.
> Conflitto con Mario + 7 (Social €960).
> [✓ Approva] [✗ Rifiuta]

### ✗ Caso C — Data occupata da un booking superiore

Esistente: Charter 5-12 agosto **€7.500**.
Nuovo: Laura Gourmet 10 agosto **€2.250**.

Revenue nuovo < esistente → **bloccato** al click Continua.

Il wizard **torna allo step pax** con banner error rosso inline:
> ⚠ Siamo spiacenti, data non disponibile per questo pacchetto. Scegli altra
> data o pacchetto.

La data 10 agosto diventa grigia nel calendario (solo per questa sessione).
Nessun addebito, nessuna email, nessun alert admin.

### ✗ Caso D — Data troppo vicina (≤ 15 giorni)

Oggi è il 3 agosto, Laura vuole il 10 agosto (7 giorni di distanza). Anche se
la data fosse occupata da un Social da 100€, il sistema **non** permette
override: siamo dentro la finestra di protezione 15 giorni.

Stesso error banner del Caso C — il cliente esistente è protetto.

---

## 5. Come funziona dalla parte dell'amministratore

L'admin ha una nuova pagina in dashboard: **"Richieste priorità"** (con badge
contatore delle richieste in attesa).

### 5.1 Override normale (DIRECT vs DIRECT)

Quando il conflitto è tra due clienti che hanno prenotato direttamente dal
nostro sito, il workflow è completamente automatico. Ogni richiesta mostra:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠  RICHIESTA PRIORITÀ — Domenica 10 agosto 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nuovo cliente:  Laura Bianchi · Gourmet · €2.250
Conflitto:      Mario Rossi + 7 · Social · €960
                Sorgente: SITO DIRETTO (8 prenotazioni)

Revenue analysis:
  Guadagno se approvi:  +€1.290 (€2.250 - €960 di rimborso)
  Finestra:             16 giorni prima data (cutoff 26 luglio)

Azioni:
  [✓ Approva] [✗ Rifiuta] [💬 Nota]
```

Admin clicca Approva → il sistema esegue tutto in automatico:
- Cancellazione booking Mario + 7 persone
- Rimborso Stripe istantaneo per ognuno
- Email di scuse personalizzata con voucher
- Conferma a Laura

### 5.2 E se la prenotazione da scavalcare arriva da Viator/Bokun/SamBoat?

Se il conflitto è con un booking arrivato da un **portale esterno** (Viator
via Bokun, Boataround, SamBoat, Click&Boat, Nautal), il processo è diverso:
il rimborso al cliente NON lo facciamo noi, lo fa il portale upstream. Il
sistema non può chiamare direttamente l'API di cancellazione del portale
perché conterebbe come "cancellazione lato fornitore", impattando
negativamente la nostra reputazione e il ranking (Viator penalizza i
fornitori che cancellano troppo).

**Decisione**: workflow manuale in 4 passi per l'admin.

```
⚠ OVERRIDE CONTRO VIATOR (via Bokun) — Checklist

Conflitto: Mario Rossi · Social €960 · BK-12345

[ ] 1. Apri Viator extranet (link diretto)
[ ] 2. Cancella prenotazione #BK-12345 su Viator
[ ] 3. Verifica che il rimborso €960 sia processato
[ ] 4. Dichiaro di aver completato manualmente i 3 passi

Stato sync: ⏳ In attesa webhook Bokun (<5 min)

[✓ Approva]  ← disabled finché checkbox + webhook pronti
[✗ Rifiuta]
```

**Come funziona**:
- Admin apre Viator extranet (link diretto dal nostro pannello) e cancella
- Viator cascada la cancellazione a Bokun
- Bokun manda webhook al nostro sistema: "questo booking è cancellato"
- Il nostro sistema aggiorna automaticamente il DB locale
- Quando le 4 checkbox sono spuntate E il webhook è arrivato, il bottone
  Approva si abilita
- Admin clicca Approva → Laura confermata, nessuna email apology noi
  (già gestita da Viator), nessun refund da parte nostra (già fatto da Viator)

**Rete di sicurezza**: 1 ora dopo l'approve, il sistema interroga Bokun
automaticamente per verificare che il booking Mario sia davvero cancellato
upstream (a volte Viator ha bug o l'admin spunta la checkbox senza aver
cancellato davvero). Se rileva che è ancora attivo → **alert fatal admin** +
bottone "Retry reconcile" per risolvere.

### 5.3 E se arriva prenotazione da portale mentre noi abbiamo già un cliente diretto?

Scenario opposto: Laura ha già prenotato Gourmet 10 agosto da noi direttamente
(CONFIRMED, pagato €3.000). Arriva un webhook Viator con nuovo booking Social
per stessa data (€960).

Il sistema **protegge Laura** di default:
- Rifiuta automaticamente il booking Viator via API cancel
- Emette alert urgente all'admin: "Conflitto cross-canale: Viator vuole €960,
  tu hai €3.000 DIRECT. Che fai?"

Admin decide manualmente:
- **Default "Protezione Laura"**: nessuna azione richiesta, il sistema ha
  già rifiutato Viator. Laura resta confermata.
- **"Revenue wins"** (raro): se Viator vuole €5.000 e Laura solo €2.000, admin
  può cancellare Laura manualmente dal pannello admin con apology + voucher +
  refund. Il booking Viator va ri-importato manualmente.

Questo workflow non scala bene alla frequenza alta: se riceviamo > 3 di questi
alert a settimana, è segnale che qualcosa non va nella sincronizzazione
(iCal lag, Bokun config errata, ecc.) → admin deve indagare la causa root.

### 5.4 Cancellation Rate: perché serve un limite

I portali esterni (Viator in particolare) tollerano una soglia massima di
cancellazioni da parte del fornitore (noi). Oltre il **5%** di booking
cancellati a nostra iniziativa, **Viator ci de-ranka** — ci fa sparire dalle
prime posizioni dei risultati di ricerca. Questo vale anche per Bokun e
Boataround.

Il sistema monitora automaticamente il **rolling 30 giorni** di cancellazioni
per-portale, con due soglie:

- **< 3%**: verde, tutto OK
- **3% - 5%**: **soft warning** rosso "avvicinandosi limite Viator"
- **> 5%**: **hard block** — l'admin **non può più approvare override** che
  coinvolgono quel canale finché il rate non scende (tipicamente 30gg dalle
  ultime cancellazioni)

Esempio: Viator al 5.1% → admin cerca di approvare nuovo override Viator →
errore:
> Impossibile approvare: Viator cancellation rate 5.1%, sopra la soglia
> 5%. Attendi che scenda prima di approvare nuovi override su Viator.

Le soglie sono configurabili (`OVERRIDE_CANCELLATION_RATE_SOFT_WARN`,
`OVERRIDE_CANCELLATION_RATE_HARD_BLOCK` in env).

---

## 6. Esempi concreti

### Esempio 1 — Il Charter si difende da solo

Charter prenotato 5-12 agosto (€7.500). Laura vuole Gourmet per 8 agosto
(€2.000). Revenue Charter > Gourmet → **override bloccato al click
Continua**.

Laura vede banner rosso, sceglie altra data. Zero intervento admin.

### Esempio 2 — Il Gourmet scavalca il Social

Domenica occupata da 8 persone Social (€960). Famiglia vuole Gourmet per
stessa domenica (€3.000).

Override eligibile → admin riceve alert → approva → 8 Social ricevono email
apology + rimborso automatico + voucher "2 drink gratis". Gourmet confermato.
**Profitto netto: +€2.040**.

### Esempio 3 — Due richieste override contemporanee

Mercoledì occupato da Social 5 pax (€600). Arrivano contemporaneamente:
- Laura: Gourmet 9pax (€2.250)
- Sofia: Gourmet 10pax (€3.000)

Sofia ha revenue più alta → il sistema auto-scavalca la richiesta di Laura
(Laura viene rimborsata automaticamente con email "Richiesta superata da
offerta di valore superiore. Rimborso in corso."). Sofia diventa la nuova
richiesta PENDING che aspetta admin. Admin approva o rifiuta Sofia.

### Esempio 4 — Gourmet scavalca Social da Viator (workflow OTA)

Mario ha prenotato Social 10 agosto tramite Viator (via Bokun). Laura vuole
Gourmet 10 agosto dal nostro sito.

Revenue Gourmet > Social, 20 giorni alla data → override eligibile.

Workflow admin:
1. Alert in dashboard con sezione "Conflitto sorgente: VIATOR (via Bokun)"
2. Admin apre detail page, vede la **checklist 4-step**:
   - Apre Viator extranet
   - Cancella #BK-12345 manualmente su Viator
   - Verifica che il rimborso sia stato processato da Viator
   - Spunta la dichiarazione di responsabilità
3. Nel frattempo Viator cascade a Bokun → webhook `bookings/cancel` arriva
   a noi → sistema aggiorna DB
4. Bottone "Approva" si abilita
5. Admin clicca Approva → Laura confermata, email conferma a Laura
6. **NON** inviamo email apology a Mario (il suo rapporto è con Viator,
   rimborso e apology li gestisce Viator)
7. 1 ora dopo, cron reconciliation verifica automaticamente che Bokun
   confermi "BK-12345 CANCELLED" → se sì, tutto OK; se no, flag e alert
   admin "Retry reconcile"

Admin ha fatto ~2 minuti di lavoro manuale (aprire Viator, cancellare), il
resto è automatico.

---

## 7. Problemi che potrebbero verificarsi

### 7.1 Cliente Mario reagisce male alla cancellazione

Mario cancellato riceve email apology con rimborso immediato + voucher 2
drink gratis. Rischio recensione negativa mitigato ma non azzerato.
Compensazione: admin può contattare direttamente via WhatsApp.

### 7.2 Admin non risponde entro 24h

Sistema manda promemoria email ogni 24h. Al 15° giorno prima data, il
sistema **auto-rifiuta** con rimborso automatico al cliente nuovo (il
cliente esistente è ormai protetto dalla finestra 15gg).

### 7.3 Revenue calcolato male per stagionalità

Il sistema usa sempre i prezzi **correnti** per confrontare: prezzo calcolato
del nuovo booking vs `totalPrice` salvato del booking esistente. Se
abbassiamo prezzi stagionali, verosimilmente l'override diventa più difficile
(nuovo booking costa meno del vecchio calcolato a prezzo di listino).
Comportamento corretto.

### 7.4 Payment: pre-auth vs full charge

**Scelta**: full charge + refund se rifiutato. Email cliente spiega
chiaramente "rimborso in 5-10 gg lavorativi se richiesta non approvata". La
pre-auth ha limiti temporali Stripe (7 giorni) troppo stretti.

### 7.5 Concorrenza con prenotazioni dei portali esterni

Quando arriva una richiesta override, la data viene **bloccata su tutti i
canali** (fan-out esistente). Nessuna vendita esterna possibile finché admin
non decide. Sblocco solo al rifiuto.

### 7.6 Amministratore che fa errori (checklist OTA previene)

Per override DIRECT: dialog di conferma esplicito prima dell'approve.
Per override OTA: le 4 checkbox della checklist sono un vincolo che impedisce
il click accidentale. Log audit completo di ogni azione admin.

### 7.7 Impatto su sistema Bokun / Boataround / iCal

- **Override DIRECT→DIRECT**: il fan-out rilascia la data sui portali esterni
  (iCal export, Bokun API), i portali vedono la data libera e possono
  riaccettarla (ma resta bloccata al booking Laura che ha vinto).
- **Override DIRECT→OTA**: admin cancella manualmente sul pannello OTA,
  Viator/Bokun cascadano a noi via webhook, sistema si aggiorna
  automaticamente. Questo è il workflow "natural propagation" che scegliamo
  invece di API cancel dirette (più sicuro, nessun impatto metriche upstream).
- **Reconciliation cron**: 1h dopo approve, verifichiamo che upstream sia
  effettivamente CANCELLED. Se no, alert admin.

### 7.8 Cancellation rate limit raggiunto

Se Viator ci è al 5.1% ultimi 30gg, admin non può approvare nuovi override
su Viator finché il rate non scende. Il sistema lo blocca con messaggio
chiaro. Admin può comunque rifiutare o aspettare.

---

## 8. Risposte del proprietario alle 12 domande

Le 12 domande poste nel brainstorm iniziale sono state tutte risolte:

| # | Domanda | Risposta | Motivazione |
|---|---|---|---|
| 8.1 | Warning pre-pagamento per cliente? | **A** (paga normalmente, nessun warning) | Trasparenza eccessiva confonderebbe; il cliente non ha bisogno di sapere il backstage. Caso B è gestito automaticamente |
| 8.2 | Messaggio cliente blocked? | **Generico inline** (al Continua, non post-payment) | Brainstorm 2026-04-23 ha cambiato timing: ora e' banner inline pax step, stesso testo per tutte le reason (blocked = blocked) |
| 8.3 | Cabin Charter revenue? | **N/A** (Cabin Charter rimosso dal catalogo) | Operativamente problematico: non c'è garanzia di vendere le 3 cabine |
| 8.4 | Multi-day override accettabile? | **A** (business prevale, admin ha visibilità ALTO IMPATTO badge) | Admin consapevole decide; sistema non auto-approva |
| 8.5 | Timeout admin a 24h? | **C** (stato limbo fino al 15° giorno pre-data, poi auto-rifiuta) | Protezione equilibrata + notifica admin daily escalation |
| 8.6 | 2 override simultanei? | **B** (auto-scavalco revenue più alta, altro rimborsato) | Evita overload admin; la regola revenue è già chiara |
| 8.7 | Cliente perdente cosa offriamo? | **B** (voucher 2 drink gratis a bordo + rebooking 3 date) | Mitiga reputazione senza costo monetario |
| 8.8 | Limite override/mese? | **D** (nessun limite tecnico ma dashboard mostra contatore + soft warning > 3/mese) | Trasparenza senza vincoli rigidi; auto-regolazione |
| 8.9 | Chi può approvare? | **A** (solo admin, 1 ruolo) | Multi-ruolo rimandato a Fase 2 |
| 8.10 | Apertura retroattiva? | **A** (solo booking da oggi) | Rispetto clienti esistenti |
| 8.11 | Override su boat-block? | **A** (manutenzione priorità assoluta) | Sicurezza non negoziabile |
| 8.12 | Half-day Fase 2? | Confermato Fase 2 | Motoscafo + half-day brainstorm separato |

**Decisioni aggiuntive dal brainstorm 2026-04-23**:

| Decisione | Scelta | Motivazione |
|---|---|---|
| Cabin Charter nel catalogo | **Rimosso** | Revenue non prevedibile, complessità operativa |
| Timing check cliente | **Al "Continua" post-pax, non post-payment** | Evita che cliente paghi e poi scopra indisponibilità |
| Workflow OTA (Viator/Bokun) | **Checklist manuale 4-step + natural propagation** | Protegge ranking (niente API cancel lato vendor) |
| Reverse override (OTA new vs DIRECT existing) | **Protezione cliente DIRECT + ManualAlert** | Non automatico; admin decide caso per caso |
| Email apology OTA | **NON inviata** (gestisce il portale upstream) | Evita confusione cliente + duplicate |
| Cancellation rate cap | **3% soft / 5% hard-block** | Viator de-ranka oltre 5% |
| Reconciliation cron post-approve | **+1h automatica** | Rileva se cancel upstream non è avvenuto |

---

## 9. Costi e tempi di implementazione

Stima tempi tecnici dopo aggiornamento brainstorm #2:

- Schema + migration (incluso nuovo status PENDING_RECONCILE_FAILED): 0.5 gg
- Business logic eligibility + cancellation-rate + reconciliation: 2 gg
- Server actions admin (approve con OTA checklist + reject): 1 gg
- Server Action `checkOverrideEligibility` (chiamata dal Continua): 0.5 gg
- Cron: reminders + dropdead + refund-retry + reconcile OTA: 1 gg
- UI admin: lista + detail + checklist OTA + polling webhook + KPI cancellation
  rate: 2.5 gg
- Sidebar + dashboard KPI integration: 0.5 gg
- UI cliente wizard (timing Continua + spinner + banner inline + greying):
  1 gg
- Email templates × 6: 1 gg
- Notification events + dispatcher + FATAL branch: 0.5 gg
- Integration tests: 2 gg
- Manual QA: 0.5 gg

**Totale: ~12 giorni lavorativi** (invariato rispetto al brainstorm #1:
-2gg per Cabin Charter rimosso, +2gg per workflow OTA + cancellation-rate +
reconcile cron).

**NON inclusi**:
- Copywriting legale email customer → da fornitore legale
- Formazione admin sul workflow OTA (checklist 4-step) → 1 sessione 30min

---

## 10. Cosa succede se NON facciamo questa feature

Scenario attuale:
- Un Social da €960 blocca una domenica che potrebbe valere €3.000 Gourmet
- Margine perso: **~€40.000/anno** stima conservativa

Scenario con feature:
- Date high-value NON restano bloccate da low-value
- Trade-off rischio: 10-20 chargeback/anno × €100 = **€1-2.000/anno**
- Overhead admin: ~5 min × N override/mese per DIRECT, ~10 min per OTA
  (apertura pannello esterno + cancel manuale)
- Rischio reputazione: 2-3 recensioni negative/anno mitigato da voucher +
  rebooking suggestions

**Net impact atteso**: **+€35.000+/anno** di margine recuperato.

---

## 11. Prossimi passi

1. ✓ Lettura doc — **completata**
2. ✓ 12 domande — **completate** (brainstorm iniziale + 2026-04-23)
3. ✓ Spec tecnica — **scritta** (2026-04-21-priority-override-fase1-trimarano-design.md)
4. ⏳ Plan implementazione — **in corso** (2026-04-21-priority-override-fase1-trimarano-plan.md)
5. ⏳ Implementazione

---

## 12. Sintesi finale decisioni design

**Business scope**:
- Trimarano only, Fase 1
- 2 pacchetti in scope: **Gourmet** (1 giorno, €2-3k) + **Charter** (3-7gg, €7.5k)
- Cabin Charter rimosso dal catalogo
- Social Giornaliero escluso dal catalogo attivo

**UX cliente**:
- Check al click "Continua" post-pax step (prima di customer info + pagamento)
- 3 scenari server: `normal` / `override_request` / `blocked`
- `blocked` = banner rosso inline pax step + greying calendario sessione
- `override_request` = transparent, cliente paga normalmente + email "in attesa"

**UX admin**:
- Dashboard: lista richieste PENDING + filtro per sorgente conflitti
- Detail page con revenue analysis + ALTO IMPATTO badge
- Per conflict OTA: checklist 4-step (apri / cancella / verifica rimborso /
  dichiara) + polling webhook sync + Approve disabled finché tutto pronto
- KPI card cancellation rate per-portale con soglie 3% warn / 5% hard block
- ManualAlert UI per reverse override (OTA→DIRECT)

**Automazioni**:
- Cron escalation reminders (24/48/72h)
- Cron dropdead auto-expire al 15° giorno
- Cron refund-retry per Stripe failures
- Cron override-reconcile +1h post-approve OTA (verifica upstream)

**Feature flag**:
- `FEATURE_OVERRIDE_ENABLED` master (DIRECT-vs-DIRECT)
- `FEATURE_OVERRIDE_OTA_ENABLED` gating OTA workflow (rollout graduale,
  2 settimane dopo DIRECT)

**Email**:
- Apology solo per override DIRECT (non OTA — gestito upstream)
- Voucher 2 drink gratis + rebooking suggestions 3 date alternative

**Stima**: 12 giorni effort. Ready per implementazione.
