# Google Things to do e Google Business Profile

Stato: step 1 completato, inventario prodotti e gap iniziali.

Obiettivo: aumentare la visibilita' dei pacchetti Egadisailing su Google, partendo da Google Business Profile e preparando il sito per un eventuale feed diretto Google Things to do senza dipendere per forza da Bokun.

Fonti operative:

- Google Things to do product feed: https://developers.google.com/actions-center/verticals/things-to-do/reference/feed-spec/product-feed
- Google Things to do policy: https://support.google.com/google-ads/answer/10723240
- Google Business Profile services: https://support.google.com/business/answer/9455399
- Google Ads / Actions Center linking: https://support.google.com/google-ads/answer/16405364

## Scelta Strategica

Usiamo due livelli separati:

1. Google Business Profile subito, con servizi custom e link alle pagine esperienza.
2. Feed Google Things to do solo dopo aver preparato dati, immagini, prezzi, POI e richiesta di accesso diretto.

Per evitare duplicati e cannibalizzazione, il feed Things to do dovrebbe avere 5 prodotti principali, con opzioni interne quando necessario. Non conviene pubblicare ogni variante come prodotto separato se l'esperienza e' quasi identica.

## Prodotti Google Consigliati

| Google product id | Prodotto | Opzioni interne | URL principali | Prezzo base 2026 | Stato |
| --- | --- | --- | --- | --- | --- |
| `tour-barca-egadi-8-ore` | Escursione in barca Favignana e Levanzo 8 ore da Trapani | Condiviso, privato | `/it/esperienze/escursione-barca-favignana-levanzo-da-trapani`, `/it/esperienze/tour-privato-favignana-levanzo-da-trapani` | da EUR 75 a persona, privato da EUR 900 per barca | pronto quasi completo |
| `tour-privato-egadi-4-ore` | Tour privato alle Egadi 4 ore da Trapani | Mattina, pomeriggio | `/it/esperienze/tour-privato-egadi-4-ore-mattina-da-trapani`, `/it/esperienze/tour-privato-egadi-4-ore-pomeriggio-da-trapani` | da EUR 630 per barca | pronto quasi completo |
| `chef-a-bordo-egadi-trimarano` | Chef a bordo alle Egadi in trimarano | Giornata privata 8 ore | `/it/esperienze/chef-a-bordo-egadi-trimarano-da-trapani` | da EUR 2000 per pacchetto | pronto quasi completo |
| `charter-egadi-trimarano` | Charter Egadi in trimarano da Trapani | 3, 4, 5, 6, 7 giorni | `/it/esperienze/charter-egadi-trimarano-da-trapani` | da EUR 3250 per 3 giorni | serve attenzione su multidata/prezzo |
| `charter-pesca-egadi` | Charter pesca Egadi da Trapani | Giornata privata 8 ore | `/it/esperienze/charter-pesca-egadi-da-trapani` | da EUR 800 per gruppo | pronto quasi completo |

## Google Business Profile: Inserimento Subito

Su Google Business Profile conviene inserire servizi custom, non titoli troppo lunghi. Le descrizioni devono essere naturali, senza telefono, senza keyword stuffing e senza promessa non verificabile.

### Categoria servizio: Tour in barca alle Isole Egadi

Servizio: Escursione in barca Favignana e Levanzo

Descrizione:

Escursione di 8 ore da Trapani verso Favignana e Levanzo, con skipper, soste bagno, snorkeling e rotta scelta in base a mare e vento. Possibili tappe a Cala Rossa, Cala Azzurra e Bue Marino.

Prezzo: da EUR 75 a persona.

Link: `/it/esperienze/escursione-barca-favignana-levanzo-da-trapani`

Servizio: Tour privato Favignana e Levanzo

Descrizione:

Barca riservata al tuo gruppo per una giornata alle Egadi da Trapani. Skipper, rotta flessibile, soste bagno e tempo per vivere Favignana e Levanzo con piu' privacy.

Prezzo: da EUR 900 per barca.

Link: `/it/esperienze/tour-privato-favignana-levanzo-da-trapani`

Servizio: Tour privato Egadi 4 ore

Descrizione:

Mezza giornata privata in barca da Trapani, ideale per gruppi che vogliono mare, bagno e relax senza impegnare l'intera giornata. Rotta scelta dallo skipper in base alle condizioni.

Prezzo: da EUR 630 per barca.

Link: `/it/esperienze/tour-privato-egadi-4-ore-pomeriggio-da-trapani`

### Categoria servizio: Charter e catamarano alle Egadi

Servizio: Charter Egadi in trimarano

Descrizione:

Charter da 3 a 7 giorni alle Isole Egadi su trimarano con comfort da catamarano, skipper e rotta tra Favignana, Levanzo e Marettimo. Su richiesta, possibile estensione verso San Vito lo Capo.

Prezzo: da EUR 3250.

Link: `/it/esperienze/charter-egadi-trimarano-da-trapani`

Servizio: Catamarano Egadi con skipper

Descrizione:

Alternativa premium al classico catamarano alle Egadi: trimarano multiscafo con skipper, spazi ampi, cabine e navigazione su piu' giornate tra le isole.

Prezzo: da EUR 3250.

Link: `/it/barche/catamarano-egadi-trimarano-da-trapani`

### Categoria servizio: Esperienze private premium

Servizio: Chef a bordo alle Egadi

Descrizione:

Giornata privata in trimarano da Trapani con chef a bordo, skipper, hostess, pranzo cucinato a bordo e soste tra Favignana e Levanzo. Esperienza premium con comfort da catamarano.

Prezzo: da EUR 2000 per pacchetto.

Link: `/it/esperienze/chef-a-bordo-egadi-trimarano-da-trapani`

### Categoria servizio: Pesca sportiva

Servizio: Charter pesca Egadi

Descrizione:

Giornata privata di pesca sportiva da Trapani su gommone dedicato, con attrezzatura professionale e rotta nelle aree consentite intorno alle Isole Egadi.

Prezzo: da EUR 800 per gruppo.

Link: `/it/esperienze/charter-pesca-egadi-da-trapani`

## Dati Che Abbiamo Gia'

- URL pubblici dedicati per ogni esperienza.
- Titolo, subtitle, SEO title e SEO description nel catalogo esperienze.
- Immagini reali per ogni prodotto.
- Prezzi 2026 in `ServicePrice`.
- Durata, capacita', pricing unit e booking flow nei `Service`.
- JSON-LD in pagina esperienza con `Product`, `TouristTrip`, `Offer`, `FAQPage`.
- Policy meteo/cancellazione gia' visibile nelle pagine esperienza.
- Sitemap con URL localizzati e hreflang.

## Dati Mancanti Prima Del Feed Diretto

Questi dati non bloccano Google Business Profile, ma servono per fare bene Google Things to do:

- Accesso diretto ad Actions Center / Things to do approvato da Google.
- Google Business Profile ID ufficiale.
- Place ID o match ufficiali per:
  - Egadisailing / punto operativo Trapani.
  - Porto di Trapani.
  - Favignana.
  - Levanzo.
  - Marettimo.
  - Cala Rossa.
  - Cala Azzurra.
  - Bue Marino.
  - San Vito lo Capo, solo per charter.
- Decisione su deep link:
  - pagina dettaglio esperienza come landing principale;
  - pagina prenotazione solo come step successivo.
- Revisione immagini:
  - almeno 1 immagine unica per prodotto;
  - nessun watermark, testo o logo sovrapposto;
  - lato minimo almeno 300 px, lato massimo entro 4000 px;
  - autorizzazione all'uso commerciale confermata.
- Rating:
  - usare rating nel feed solo se il conteggio e' verificabile e visibile in pagina;
  - altrimenti evitare rating nel primo feed.
- Regole multidata per `charter-egadi-trimarano`:
  - prezzo calcolato in base a data partenza e data ritorno;
  - opzioni 3, 4, 5, 6, 7 giorni coerenti tra feed, pagina e calendario.
- Monitor errori feed:
  - report prodotti rifiutati;
  - mismatch prezzo;
  - landing non coerente;
  - immagini non idonee;
  - location non matchata.

## Sequenza Operativa

### Step 1: Inventario prodotti

Stato: completato in questo documento.

Output:

- 5 prodotti principali.
- Opzioni interne collegate ai service id reali.
- Prezzi base e URL principali.
- Gap iniziali identificati.

### Step 2: Google Business Profile

Azioni:

- Verificare che il profilo sia rivendicato e verificato.
- Aggiornare categoria primaria e categorie secondarie, senza forzare keyword nel nome business.
- Inserire i servizi custom sopra.
- Caricare 5-10 foto forti per servizi, non solo foto generiche.
- Aggiungere link al sito e link prenotazione.
- Pubblicare post periodici sui pacchetti principali.
- Continuare richiesta recensioni Google dopo ogni uscita.

### Step 3: Feed-ready nel codice

Azioni:

- Aggiungere un mapping dati Google separato dal copy UI.
- Mantenere product id e option id stabili.
- Collegare ogni option a `serviceId`, URL, durata, prezzo, pricing unit, POI e immagini.
- Creare un export JSON locale di preview, non ancora pubblico.
- Validare che i link siano 200 e che le immagini esistano.

### Step 4: Richiesta Google Things to do diretta

Azioni:

- Compilare Partner Intake form.
- Preparare elenco prodotti e URL.
- Preparare contatto tecnico.
- Attendere approvazione Actions Center.

### Step 5: Feed tecnico

Solo se Google approva:

- Generare `ProductFeed` JSON.
- Configurare upload SFTP/snapshot.
- Gestire errori feed.
- Collegare eventuale Google Ads account.
- Monitorare prezzo, availability e landing quality.

## Prossimo Passo Consigliato

Prima di scrivere codice feed, completare Step 2:

1. Prendere accesso manager al Google Business Profile.
2. Inserire i servizi di questo documento.
3. Recuperare Google Business Profile ID e, se possibile, i Place ID principali.
4. Dopo questo, preparare il mapping feed-ready nel codice.
