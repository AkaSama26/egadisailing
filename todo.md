# TODO Egadisailing

## Bokun: mezza giornata privata

- [ ] Allineare Bokun al modello del sito: la mezza giornata privata ha due slot distinti.
- [ ] Decidere il modello Bokun:
  - Opzione consigliata: due prodotti Bokun separati, uno per `boat-exclusive-morning` e uno per `boat-exclusive-afternoon`.
  - Opzione alternativa: un solo prodotto Bokun con due start time, ma richiede mappatura tecnica `productId + startTimeId -> serviceId`.
- [ ] Allineare gli orari pubblici:
  - Mattina sito/ticket: `09:00-13:00`.
  - Pomeriggio sito/ticket: `14:00-18:00`.
  - Bokun oggi espone il prodotto `1174698` con start time `10:00`, da correggere prima della vendita.
- [ ] Se si usano due prodotti Bokun:
  - Mappare prodotto mattina su `boat-exclusive-morning`.
  - Mappare prodotto pomeriggio su `boat-exclusive-afternoon`.
  - Verificare import prenotazioni Bokun, webhook, closeout availability e cancellazione.
- [ ] Se si usa un solo prodotto Bokun con due start time:
  - Aggiungere una tabella o configurazione di mapping per `bokunProductId` + `startTimeId`.
  - Aggiornare import booking Bokun per scegliere il servizio corretto in base allo start time.
  - Aggiornare availability push per chiudere/aprire lo start time corretto, non tutto il prodotto.
  - Aggiungere test integration per mattina/pomeriggio.
