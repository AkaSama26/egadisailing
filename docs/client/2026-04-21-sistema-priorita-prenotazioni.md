# Sistema di priorità nelle prenotazioni — proposta

**Documento per discussione con la proprietà. Non è ancora implementato.**

Data: 21 aprile 2026

---

## 1. Il problema che vogliamo risolvere

Oggi il calendario prenotazioni tratta tutte le esperienze nello stesso modo: "prima
prenotato = prima servito". Se un cliente prenota un **tour giornaliero condiviso**
da 120€ a persona per domenica 10 agosto, quella data diventa **non più
vendibile** per un **Gourmet** da 2000€ o un **Charter** da 7500€.

Questo ci fa perdere soldi: una domenica "bloccata" da un piccolo gruppo social
può valere molto di più venduta come Gourmet o Charter.

**L'idea**: introdurre un sistema di priorità basato sul **valore economico**
della prenotazione. Se arriva una richiesta che vale di più di quella già
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

## 3. I 4 pacchetti attuali

| Pacchetto | Durata | Capacità | Prezzo base |
|---|---|---|---|
| **Gourmet** | 1 giorno intero | 8-10 persone | 2.000€ (bassa stagione) |
| **Cabin Charter** | 7 giorni | Max 3 cabine × 2 = 6 persone | 2.500€/cabina/settimana |
| **Charter** | 3-7 giorni | 6 persone | 7.500€/settimana |
| **Giornaliero Social** | 1 giorno | 11-20 persone | 120-150€/persona |

Il valore totale varia per stagione, durata effettiva e numero persone. Esempi
concreti di fatturato:

- Gourmet tipico bassa stagione: 8pax × ~250€ = **~2.000€**
- Gourmet tipico alta stagione: 10pax × ~300€ = **~3.000€**
- Cabin Charter 1 settimana pieno: 3 cabine × 2.500€ = **7.500€**
- Cabin Charter 1 settimana parziale: 1 cabina = **2.500€**
- Charter 7 giorni: **7.500€**
- Social 1 giorno con 15 pax: 15 × 130€ = **~1.950€**
- Social 1 giorno con 20 pax: 20 × 150€ = **~3.000€**

---

## 4. Come funzionerà per il cliente sul sito — passo passo

### Scenario: Laura visita il sito il 25 luglio, vuole Gourmet per il 10 agosto

**Step 1** — Laura clicca "Gourmet" nella pagina esperienze.

**Step 2** — Si apre il calendario. Tutte le date sono **selezionabili** (niente
date "grigie" che confondono il cliente). Laura clicca 10 agosto.

**Step 3** — Compila il form: nome, email, 9 persone, dati carta.

**Step 4** — Cliccando "Conferma e paga", il sistema controlla dietro le quinte:

> C'è già una prenotazione su questa data? Se sì, quanto vale?
> La nuova prenotazione di Laura vale di più?
> Siamo a più di 15 giorni dalla data?

In base al risultato, succede una di queste 4 cose:

---

### ✓ Caso A — Data libera (nessun conflitto)

Laura vede:
> "Pagamento in corso..." → "Prenotazione confermata! Riceverai email con dettagli"

**Funzionamento normale, come adesso.**

---

### ✓ Caso B — Data occupata da un booking minore, override possibile

Esistente: Social 10 agosto, 8 persone, **€960 fatturato**.
Nuovo: Laura Gourmet 9 persone, **€2.250** preventivo.

Revenue nuovo (2.250) > revenue esistente (960) + siamo a 16 giorni > 15 → override eligibile.

Laura vede, **prima di pagare**, un messaggio di avviso:
> ⚠️ **Richiesta di disponibilità**
>
> Questa data è attualmente occupata da un'altra prenotazione. La tua
> richiesta sarà verificata dal nostro team entro 24 ore. Se approvata, la
> tua prenotazione sarà confermata. Se rifiutata, riceverai il rimborso
> completo.
>
> [Conferma e paga] [Scegli altra data]

Se conferma:
- Laura paga 2.250€
- Booking creato in stato "IN ATTESA CONFERMA ADMIN"
- Laura riceve email: "Richiesta ricevuta. Ti contattiamo entro 24h."

Admin riceve alert in dashboard:
> Nuova richiesta override: Laura (Gourmet €2.250) su 10 agosto.
> Conflitto con Mario + 7 altri (Social €960).
> [✓ Approva override] [✗ Rifiuta]

Se admin **approva**:
- Mario + 7 persone cancellate automaticamente
- Rimborso automatico integrale ai Social
- Email di scuse inviata: "Ci dispiace, abbiamo dovuto cancellare per [motivo]"
- Laura riceve email: "Il tuo Gourmet del 10 agosto è confermato!"

Se admin **rifiuta**:
- Laura riceve rimborso automatico
- Email: "Ci dispiace, la data non è disponibile. Ti proponiamo: 11 agosto, 17 agosto..."

---

### ✗ Caso C — Data occupata da un booking di valore superiore

Esistente: Charter 5-12 agosto **€7.500** (7 giorni interi).
Nuovo: Laura Gourmet 10 agosto **€2.250** preventivo.

Revenue nuovo (2.250) < revenue esistente (7.500) → override **non** conviene.

Laura vede al submit:
> ❌ **Questa data non è disponibile per il Gourmet**
>
> Un'altra prenotazione di valore superiore è in corso. Non possiamo
> sostituirla.
>
> **Date alternative vicine libere:**
>   [13 agosto] [14 agosto] [15 agosto]
>
> [Scegli altra data]

Nessun addebito, nessuna richiesta all'admin.

---

### ✗ Caso D — Data troppo vicina (≤ 15 giorni)

Oggi è il 3 agosto, Laura vuole Gourmet per 10 agosto (7 giorni di distanza).

Anche se la data fosse occupata da un Social da 100€, il sistema **non** permette
override: siamo dentro la finestra di protezione 15 giorni.

Laura vede:
> ❌ **Questa data non è più modificabile**
>
> Per garantire il servizio ai clienti già prenotati, non modifichiamo il
> calendario nelle ultime 2 settimane prima della data.
>
> **Date disponibili vicine:** [20 agosto] [21 agosto] [22 agosto]

---

## 5. Come funziona dalla parte dell'amministratore

L'admin ha una nuova pagina in dashboard: **"Richieste priorità"** (badge con
contatore delle richieste in attesa).

Ogni richiesta mostra:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠  RICHIESTA PRIORITÀ — Domenica 10 agosto 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nuovo cliente che vuole prenotare:
  Laura Bianchi · Gourmet · 9 persone · €2.250
  Booking #DRC-K8X2B (in attesa di conferma admin)
  📧 laura@email.com · 📞 +39 333 1234567

Conflitto con:
  👥 Mario Rossi + 7 altri · Social condiviso · €960
  8 prenotazioni (Mario, Giulia, Anna, Paolo, Luca, Martina, Davide, Elisa)
  5 booking da "Sito diretto", 3 da Bokun

Revenue analysis:
  Guadagno se approvi:  +€1.290 (€2.250 - €960 di rimborso)
  Finestra override:    ancora 8 giorni prima del blocco (cut-off: 26 luglio)

Azioni:
  [✓ Approva — cancella i Social, conferma Laura]
  [✗ Rifiuta — rimborsa Laura]
  [💬 Note: motivo della decisione (opzionale)]
```

Admin clicca e il sistema esegue tutto automaticamente:
- Cancellazione con email di scuse personalizzata per ogni cliente impattato
- Rimborso Stripe istantaneo
- Conferma al nuovo cliente

---

## 6. Esempi di scenari complessi

### Esempio 1 — Il Charter esclusivo si difende da solo

Situazione: Charter prenotato per 5-12 agosto (€7.500). Gourmet richiesto per 8
agosto (€2.000). Revenue Charter > Gourmet → override bloccato.

**Risultato**: Laura vede "non disponibile". Zero intervento admin.

### Esempio 2 — Il Gourmet scavalca il Social

Situazione: domenica occupata da 8 persone Social (€960). Gourmet famiglia 10
pax richiesto per stessa domenica (€3.000).

**Risultato**: override eligibile. 8 Social ricevono email di scuse + rimborso
automatico. Gourmet confermato. **Profitto netto: +€2.040** (3000 - 960 = 2040).

### Esempio 3 — Due richieste override contemporanee

Situazione: mercoledì occupato da Social 5 pax (€600). Arrivano
contemporaneamente:
- Laura: Gourmet 9pax (€2.250)
- Sofia: Gourmet 10pax (€3.000)

**Regola proposta**: entrambe vanno in stato "IN ATTESA ADMIN". Admin vede:
> 2 richieste concorrenti su questa data.
> [Approva solo Sofia] [Approva solo Laura] [Rifiuta entrambe]

Se admin approva Sofia: il Social cancellato (€600 rimborso) + Laura rimborsata
(€2.250) + Sofia confermata.

**Problema aperto**: è giusto il comportamento o vuoi che il sistema scelga
automaticamente la richiesta a revenue maggiore?

### Esempio 4 — Multi-day: il Cabin Charter di Mario

Situazione: Mario prenota 1 cabina Cabin Charter per 5-12 agosto (€2.500).
Arriva Gourmet per 8 agosto (€3.000 alta stagione).

Revenue nuovo > esistente → override eligibile.

**Ma**: approvare significa cancellare l'INTERA settimana Cabin Charter di
Mario (non solo l'8 agosto). Mario perde 7 giorni di vacanza.

Admin vede l'alert completo: "Approvare scavalca 7 giorni di vacanza di Mario
(cancellazione totale settimana)". Può decidere consapevolmente.

**Problema etico da discutere con i clienti**: è accettabile cancellare una
vacanza settimanale già programmata per 1 giorno di Gourmet? Business-wise sì
(+€500 guadagno), ma rischio recensioni 1-stella alto.

### Esempio 5 — Cabin Charter parzialmente venduto

Situazione: 5-12 agosto, 1 sola cabina venduta a Mario (€2.500). Le altre 2
cabine sono libere (totali possibili €7.500 non raggiunti).

Arriva richiesta Charter esclusivo (€7.500) per 5-12 agosto.

**Problema aperto**: come calcolare il revenue del Cabin Charter esistente?
- Opzione A: solo quello **già pagato** (€2.500) → Charter vince
- Opzione B: quello **potenziale** se tutte le cabine venissero vendute (€7.500) → Charter pari → override bloccato
- Opzione C: admin decide caso per caso — sistema mostra entrambi i numeri

---

## 7. Problemi che potrebbero verificarsi

### 7.1 Cliente Mario reagisce male alla cancellazione

Mario aveva prenotato il suo Social per festeggiare il compleanno della nonna.
Riceve email di cancellazione. **Conseguenze possibili**:
- Recensione negativa su Google / Tripadvisor
- Chargeback bancario (rifiuto del rimborso perché insoddisfatto)
- Passaparola negativo

**Soluzioni proposte**:
- Email di scuse molto curata (già sviluppata) con:
  - Scuse formali + ammissione dell'errore
  - Rimborso completo immediato
  - **Voucher 10-20% di sconto** su prossima prenotazione
  - Contatto diretto per assistenza (WhatsApp admin)
- Limitare admin a **max N override/mese** per evitare abuso
- Tracciare metriche: N recensioni negative / N chargeback dopo override

### 7.2 Admin non risponde entro 24h

Laura ha pagato €2.250 ma admin in ferie. Cosa succede?

**Soluzione proposta** (da discutere):
- Laura vede il booking in "IN ATTESA" indefinitamente
- Sistema manda promemoria email all'admin ogni 24h
- **Linea rossa al 15° giorno prima della data**: se admin non ha ancora deciso,
  sistema auto-rifiuta + rimborso automatico Laura

### 7.3 Revenue calcolato male per stagionalità

Se cambiamo i prezzi stagionali, il sistema deve ricalcolare revenue
dinamicamente. Problema: il booking esistente ha il suo `totalPrice` fissato al
momento della prenotazione. Se abbassiamo i prezzi stagionali, il nuovo preventivo
è più basso del listino originale del booking precedente → override più difficile.

**Soluzione proposta**: sistema usa sempre i prezzi **correnti** per entrambi
(nuovo e ipotetico del esistente ricalcolato). Da confermare.

### 7.4 Payment: pre-auth vs full charge

Oggi quando Laura paga, è un **addebito vero**. Se admin rifiuta, serve refund
(5-10 giorni lavorativi Stripe).

**Alternativa**: pre-autorizzazione Stripe (blocco €2.250, non prelevato). Admin
approva → si converte in addebito. Admin rifiuta → rilascio pre-auth istantaneo
(zero tempi bancari).

**Problema**: pre-auth ha limite temporale (7 giorni Stripe). Se admin non decide
entro 7 giorni, pre-auth scade e bisogna chiedere a Laura di ripagare. Complicato.

**Soluzione pragmatica**: full charge + refund se rifiutato. Laura riceve email
che spiega chiaramente: "Verrai rimborsata tra 5-10 giorni lavorativi se la
richiesta non va a buon fine."

### 7.5 Concorrenza con prenotazioni dei portali esterni

I portali (Bokun, Boataround, etc.) prenotano automaticamente tramite webhook.
Un portale potrebbe accettare un Social su quella data mentre Laura sta
compilando la richiesta override.

**Soluzione**: il sistema **riconferma** al submit che la data sia ancora come
attesa. Se nel frattempo è cambiata (nuovo Social arrivato da Bokun), mostra
errore "La situazione della data è cambiata. Riprova."

### 7.6 Amministratore che fa errori

Admin clicca Approva su override "sbagliato" (pensava fosse una data diversa).
Esistente già cancellato + rimborsato.

**Soluzione proposta**:
- Dialog di conferma esplicito: "Confermi cancellazione di 8 clienti Social
  con rimborso €960?"
- Log dettagliato audit_log con chi ha fatto cosa quando
- NO possibilità di "annullare override" (operazione irreversibile, il cliente
  cancellato non si può "ri-prenotare" automaticamente)

### 7.7 Impatto su sistema Bokun / Boataround / iCal

I portali esterni sanno quando cancelliamo un Social → pubblichiamo la data
come libera upstream → i portali riaprono le vendite → rischio nuova
prenotazione Social sulla stessa data da portale esterno MENTRE admin sta
ancora decidendo il Gourmet.

**Soluzione proposta**: quando arriva richiesta override, la data viene
**bloccata su tutti i canali** (fan-out esistente). Nessuna vendita esterna
possibile finché admin non decide. Sblocchi solo al rifiuto.

### 7.8 Cabin Charter parzialmente venduto (ripreso da §6 Esempio 5)

Se solo 1 cabina su 3 è venduta, la domanda è: il booking esistente "vale"
€2.500 o €7.500? Il fatturato potenziale è 7.500 ma l'incasso attuale è 2.500.

**Questo è un caso critico** — decisione business necessaria.

---

## 8. Domande che devi decidermi tu (proprietario)

Queste sono le decisioni che non posso prendere io perché dipendono dalla tua
filosofia di business, tolleranza al rischio reputazionale, e politica
commerciale:

### 8.1 Cliente al submit — vede il warning prima del pagamento?

Scenario: Laura sta per pagare €2.250 per un Gourmet il 10 agosto. La data ha
già un Social attivo (override eligibile).

**A**: Paga normalmente, scopre dopo che era in attesa admin (zero warning)
**B**: Vede modal chiaro "questa data è occupata, richiesta verrà valutata" +
conferma esplicita prima del pagamento
**C**: Paga solo 30% deposito (rimborsabile), saldo solo dopo approvazione

**Raccomandazione**: B (trasparenza, commitment chiaro).

### 8.2 Se override NON eligibile, che messaggio vede il cliente?

**A**: Errore generico "Data non disponibile, prova altre date"
**B**: Errore con date alternative suggerite automaticamente
**C**: Errore con suggerimento "aumenta n° persone per tentare override"
**D**: Diverso in base al motivo: "vicina alla data" vs "valore insufficiente"

**Raccomandazione**: D (onestà e chiarezza).

### 8.3 Cabin Charter: revenue esistente quanto vale?

Se solo 1 cabina su 3 è venduta (€2.500 incassato, €7.500 potenziale):

**A**: Usa il **pagato reale** (€2.500) → è facile override da parte del Gourmet
**B**: Usa il **potenziale pieno** (€7.500) → override quasi impossibile
**C**: Usa un **mezzo** (media o 50% del potenziale)
**D**: Admin decide caso per caso (sistema mostra entrambi)

**Nota**: se scegli A, molti Cabin Charter verranno scavalcati; se scegli B,
quasi nessuno → scelta impatta molto la frequenza override.

### 8.4 Multi-day override è accettabile?

Scenario: Cabin Charter 7 giorni (€2.500) scavalcato da Gourmet 1 giorno (€3.000).
Mario perde tutta la settimana per €500 di margine.

**A**: SÌ, il business prevale. Mario cancellato + voucher sconto.
**B**: NO, multi-day è protetto. Override possibile solo su single-day vs single-day.
**C**: SÌ ma solo se guadagno > N% (es. +30%). Sotto N% bloccato per etica.
**D**: Sempre admin decide, nessuna regola automatica su multi-day.

### 8.5 Tempo decisione admin — cosa succede al 24° ora?

**A**: Auto-rifiuta dopo 24h (cliente protetto, zero impatto su admin)
**B**: Auto-approva dopo 24h (cliente nuovo prevale, admin colpevole se non agisce)
**C**: Stato limbo infinito fino al 15° giorno pre-data → auto-rifiuta
**D**: Escalation: 24h promemoria email, 48h SMS all'admin, 72h auto-rifiuta

**Raccomandazione**: C (protezione equilibrata) con notifica admin daily.

### 8.6 2 override simultanei stesso slot — chi vince?

Laura €2.250 e Sofia €3.000 entrambe vogliono scavalcare Mario €960.

**A**: Admin vede entrambi e sceglie (decisione umana su bidding de-facto)
**B**: Sistema auto-sceglie la più alta revenue (€3.000). L'altra rifiutata auto.
**C**: First-come-first-served (Laura ha cliccato prima di Sofia → Laura vince)
**D**: Gara entro 2h: entrambe in attesa, sistema alza il vincitore al revenue
     più alto

**Raccomandazione**: A (admin vede il contesto, niente automatismi su denaro).

### 8.7 Cliente "perdente" — cosa gli offriamo oltre al rimborso?

Mario è stato cancellato. Oltre al rimborso immediato, gli offriamo:

**A**: Niente altro, solo rimborso (rischioso reputazionalmente)
**B**: Voucher 10% sconto prossima prenotazione (€96 di valore su 960 = 10%)
**C**: Voucher 20-25% sconto + corsia preferenziale rebooking
**D**: Rimborso + proposta personalizzata (telefonata dedicata se contatto 
     admin possibile)

**Raccomandazione**: C (mitiga rischio recensioni, costa poco se override raro).

### 8.8 Limite numerico override/mese

Per evitare che il sistema cancelli 30 clienti/mese in alta stagione:

**A**: Nessun limite, tutti gli override eligibili approvati
**B**: Max N override/mese (es. 5) → alert se cerchi di superare
**C**: Max N% clienti impattati/mese (es. 2%) → dinamico in base a volume
**D**: Nessun limite tecnico ma dashboard admin mostra "N override questo mese"
     per auto-regolazione

**Raccomandazione**: D (trasparenza senza vincoli hardcoded).

### 8.9 Chi può vedere/approvare gli override?

**A**: Solo tu (proprietario, 1 admin)
**B**: Tu + N dipendenti autorizzati (oggi User.role="ADMIN" è unico ruolo)
**C**: Approvazione a 2 mani: admin propone, proprietario conferma (per override
     grossi > €5.000)

**Nota**: oggi ogni admin ha stessi permessi. Per implementare C serve aggiungere
ruoli (SENIOR_ADMIN, JUNIOR_ADMIN).

### 8.10 Apertura retroattiva: i booking già esistenti vengono convertiti?

Quando lanciamo la feature, tutti i booking già in DB esistono senza "priorità
revenue". Come trattiamo:

**A**: Nessuna conversione — la feature vale solo per prenotazioni future da
     oggi in poi.
**B**: Backfill — ricalcola revenue di tutti i booking passati, la feature 
     funziona subito.
**C**: Ibrido — feature attiva dal giorno 1, ma non consente override sui booking
     creati **prima** del lancio (protezione retroattiva dei clienti "vecchi").

**Raccomandazione**: C (rispetto reputazione + uncontestable).

### 8.11 Override su boat-block admin manuale

Situazione: admin ha bloccato manualmente la barca per manutenzione.
Arriva richiesta Gourmet alta-priorità. È più importante la manutenzione o il
Gourmet?

**A**: Boat-block ha priorità assoluta (no override possibile). Manutenzione
     è sacra.
**B**: Revenue decide anche qui: se Gourmet vale più del "costo della
     manutenzione mancata", admin può approvare.
**C**: Sempre admin decide. Il sistema mostra alert ma non bloccca.

**Raccomandazione**: A (la manutenzione ha implicazioni di sicurezza).

### 8.12 Half-day (pacchetti mezza giornata) — deferred?

Abbiamo parcheggiato questa domanda. Confermi che:
- **Fase 1** (subito implementabile): solo pacchetti a giornata intera + multi-day
- **Fase 2** (futuro prossimo): introduzione mezza-giornata con calendario a slot
  mattina/pomeriggio?

Oppure pianifichiamo mezza-giornata nella stessa tranche iniziale?

---

## 9. Costi e tempi di implementazione

**Stima tempi tecnici** (solo indicativa, dopo approvazione specifica):

- Nuovo modello DB + migrazione: 2-3 giorni
- Logica revenue + eligibilità override: 2-3 giorni
- UI admin (pagina richieste override, alert dashboard): 3-4 giorni
- Email template ("apology" esiste già, "override approvato/rifiutato" nuovi):
  1-2 giorni
- Integrazione fan-out esistente per bloccare canali esterni: 1 giorno
- Testing + edge cases: 3-4 giorni

**Totale**: ~12-17 giorni lavorativi di sviluppo.

**NON inclusi**:
- Copywriting legale email customer (scuse, rimborso) → da fornitore legale
- Formazione admin sul nuovo flusso → 1 sessione da concordare

---

## 10. Cosa succede se NON facciamo questa feature

Scenario attuale:
- Un Social da €960 blocca una domenica che potrebbe valere €3.000 Gourmet
- Margine perso: **€2.000 a settimana × 20 settimane stagione = €40.000+/anno**
  (stima conservativa)

Scenario con feature:
- Le date high-value NON restano bloccate da low-value
- Trade-off: rischio 10-20 chargeback/anno × €100 dispute = **€1-2.000/anno**
- Overhead admin per decisione: ~5 min × N override/mese
- Rischio reputazione 2-3 recensioni negative/anno

**Net impact atteso**: +€35.000+/anno di margine recuperato.

---

## 11. Prossimi passi

1. **Tu leggi il documento** e rispondi alle **12 domande in Sezione 8**
2. Decidiamo **priorità fase 1** (subito) vs **fase 2** (dopo)
3. Scrivo la specifica tecnica dettagliata per gli sviluppatori
4. Produciamo un piano implementativo con tempi precisi
5. Iniziamo implementazione

Nessuna decisione tecnica è già stata presa: tutto dipende da come vuoi che il
business si comporti in ognuno di questi scenari.

---

## 12. Riepilogo per decisione rapida

Se ti serve rispondere solo le domande urgenti, queste 4 hanno l'impatto più alto
sul design:

- **8.1** Warning pre-pagamento per cliente (A/B/C)?
- **8.3** Cabin Charter: revenue pagato o potenziale (A/B/C/D)?
- **8.4** Multi-day override permesso (A/B/C/D)?
- **8.5** Timeout admin: comportamento a 24h e oltre (A/B/C/D)?

Le altre 8 possiamo chiuderle in una seconda chiamata.
