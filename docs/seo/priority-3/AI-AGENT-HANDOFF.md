# AI Agent Handoff - SEO Priority 3

Questo documento e' pensato per un altro agente AI che lavorera' in locale sul progetto Egadisailing. Serve a spiegare cosa fare con i documenti in `docs/seo/priority-3/` e come trasformarli in modifiche reali al sito senza creare cannibalizzazione SEO o promesse commerciali sbagliate.

## Contesto

Abbiamo creato un piano SEO operativo pagina per pagina. La cartella contiene:

- `README.md`: panoramica della strategia.
- `ORCHESTRATOR.md`: checklist esecutiva e ruoli di controllo.
- `CANNIBALIZATION-MATRIX.md`: mappa degli intenti per evitare pagine concorrenti tra loro.
- `KEYWORD-GLOSSARY.md`: glossario keyword per IT/EN/ES/FR/DE.
- `templates/page-brief-template.md`: template standard.
- `pages/**/*.md`: brief operativi per ogni pagina canonica.

Il lavoro richiesto non e' "aggiungere keyword ovunque". Il lavoro e' allineare ogni pagina a un intento unico, distinguere homepage, hub, dettagli esperienza e guide, e rendere Google capace di scegliere la URL corretta per ogni query.

## Ordine Di Lettura Obbligatorio

1. Leggi `README.md`.
2. Leggi `CANNIBALIZATION-MATRIX.md`.
3. Leggi `KEYWORD-GLOSSARY.md`.
4. Leggi `ORCHESTRATOR.md`.
5. Leggi il brief della pagina che devi implementare in `pages/`.
6. Prima di modificare codice, verifica la pagina reale nel progetto e confrontala con il brief.

## Priorita' Di Implementazione

Procedere per sprint, non su tutte le pagine insieme.

### Sprint 1 - Money Pages Principali

Implementare in questo ordine:

1. `pages/home.md`
2. `pages/experiences-hub.md`
3. `pages/experiences/shared-favignana-levanzo-8h.md`
4. `pages/experiences/private-favignana-levanzo-8h.md`
5. `pages/private-boat-with-skipper.md`
6. `pages/prenota.md`

Obiettivo dello Sprint 1:

- Homepage = brand, fiducia, premium, smistamento.
- Hub esperienze = pagina principale per "tour in barca alle Egadi da Trapani".
- Dettagli esperienza = intenti specifici, non duplicati.
- Landing skipper = intercetta "barca/noleggio con skipper", senza promettere bareboat.
- Prenota = transazionale, non hub commerciale.

### Sprint 2 - Esperienze Secondarie

Implementare:

- `pages/experiences/private-egadi-4h-morning.md`
- `pages/experiences/private-egadi-4h-afternoon.md`
- `pages/experiences/lunch-on-board-trimaran.md`
- `pages/experiences/trimaran-charter-egadi.md`
- `pages/experiences/fishing-charter-egadi.md`

Obiettivo:

- Ogni pagina deve avere un motivo chiaro per esistere.
- Evitare che tutte sembrino "tour in barca Egadi".
- Dare a ciascuna title, H1, FAQ, CTA e internal links coerenti con il proprio intento.

### Sprint 3 - Cluster Guide E Isole

Implementare guide e pagine isola dopo le money pages.

Priorita':

1. Guide Favignana che linkano ai tour Favignana/Levanzo.
2. Guide Levanzo che linkano ai tour coerenti.
3. Pagine isole hub e dettaglio.
4. Guide Marettimo solo informazionali.

Regola critica:

- Marettimo NON deve promettere un tour giornaliero o un tour grotte venduto da Egadisailing.
- Le pagine Marettimo possono parlare di charter solo come possibilita' contestuale, non come day tour prenotabile.

### Sprint 4 - Supporto, Barche, Legal

Implementare:

- `pages/boats/**/*.md`
- `pages/about.md`
- `pages/contacts.md`
- `pages/faq.md`
- legal pages

Obiettivo:

- Rafforzare fiducia, local SEO, NAP, E-E-A-T e internal linking.
- Non creare nuove money page involontarie.

## Regole Strategiche Non Negoziabili

- Non usare "senza skipper", "bareboat" o "noleggio libero" se il servizio non esiste.
- Non creare o ottimizzare una landing commerciale per "tour grotte Marettimo".
- Non far competere homepage e `/esperienze` sulla stessa keyword primaria.
- Non trasformare `/prenota` in una pagina commerciale generica.
- Non duplicare FAQ identiche tra hub e dettagli.
- Non forzare frequenze keyword se il testo diventa artificiale.
- Le frequenze keyword nei brief sono guide editoriali, non target matematici.

## Come Implementare Una Pagina

Per ogni pagina:

1. Apri il brief corrispondente in `docs/seo/priority-3/pages/`.
2. Individua la route e i file reali nel progetto.
3. Controlla title, meta description, H1, intro, H2/H3, FAQ, CTA, alt immagini, schema e internal links.
4. Applica solo modifiche coerenti con il brief.
5. Verifica `CANNIBALIZATION-MATRIX.md` prima di usare keyword primarie di altre pagine.
6. Aggiorna copy in tutte le lingue supportate quando la pagina e' localizzata.
7. Mantieni canonical e hreflang coerenti con lo schema esistente.

## QA Prima Del Commit

Per ogni sprint:

- Eseguire una build:

```bash
docker compose -f docker-compose.prod.yml build app
```

- Controllare almeno queste URL:
  - homepage IT/EN
  - hub esperienze IT/EN
  - dettaglio 8h condiviso IT/EN
  - dettaglio 8h privato IT/EN
  - pagina `prenota`
  - eventuale nuova landing skipper

- Verificare:
  - title e meta description coerenti
  - un solo H1 chiaro
  - canonical corretto
  - hreflang IT/EN/ES/FR/DE
  - JSON-LD valido
  - FAQ non duplicate
  - link interni con anchor descrittive
  - nessuna promessa commerciale falsa

## Output Atteso Per Ogni Sprint

Ogni sprint deve produrre:

- Modifiche implementate nelle pagine reali.
- Breve report dei file modificati.
- Elenco dei brief usati.
- Note su eventuali decisioni rimandate.
- Esito build/QA.
- Lista rischi residui, se presenti.

## Nota Sullo Stato Locale

Prima di lavorare, controllare sempre:

```bash
git status -sb
```

Potrebbero esistere modifiche locali non correlate. Non revertire e non includere nel commit file fuori dallo sprint senza conferma esplicita.
