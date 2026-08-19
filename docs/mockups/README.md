# Mockup presenze giornaliere

Proposte visuali per mostrare il totale delle persone prenotate per data nel
calendario e nella lista prenotazioni dell'area amministrativa.

- `presenze-proposta-a.png`: prima esplorazione con badge compatto.
- `presenze-proposta-a-tabs-mezzo.png`: proposta A aggiornata con un solo
  calendario, tab per cambiare mezzo, heatmap e giornate Exclusive; la lista a
  destra mostra le sole prenotazioni del giorno selezionato.
- `presenze-proposta-b.png`: persone/capienza con barra di riempimento.
- `presenze-proposta-c.png`: heatmap e riepilogo settimanale.

Il prototipo navigabile e' stato rimosso dopo l'approvazione. La vista scelta e'
ora implementata in `src/app/admin/(dashboard)/calendario/`; queste immagini
restano come storico delle alternative valutate.

## Dashboard uscite

- `dashboard-uscite-a.png`: lista operativa per mezzo.
- `dashboard-uscite-b.png`: schede flotta visuali.
- `dashboard-uscite-c.png`: tabella compatta.

Il confronto navigabile e' disponibile solo in sviluppo su
`/admin/mockup-dashboard-uscite?variant=a|b|c`.

## Finanza

- `finanza-a.png`: vista bilanciata con KPI, andamento incassi e due tabelle.
- `finanza-b.png`: vista analitica con due grafici lineari e tabella unica.
- `finanza-c.png`: vista centrata sul confronto economico tra i mezzi.

Il confronto navigabile pubblico e' disponibile su
`/mockup-finanza?variant=a|b|c`, senza autenticazione admin.

## Dettaglio prenotazione — pagamenti

- `dettaglio-prenotazione-a.png`, `Movimenti`: tabella cronologica degli incassi e saldo residuo;
- `dettaglio-prenotazione-b.png`, `Conto cliente`: prospetto contabile con dovuto, incassato e saldo progressivo;
- `dettaglio-prenotazione-c.png`, `Piano pagamenti`: acconto, integrazioni e saldo organizzati per fase.

Il confronto navigabile pubblico e' disponibile su
`/mockup-dettaglio-prenotazione?variant=a|b|c`, senza autenticazione admin.
