import type { WeatherRisk } from "./risk-assessment";

export interface ReassuranceMessage {
  title: string;
  body: string;
  showGuarantee: boolean;
  showAlternativeDates: boolean;
}

/**
 * Messaggio UI calibrato sul rischio meteo della data selezionata.
 * - LOW: nessuna warning, solo conferma condizioni ideali
 * - MEDIUM/HIGH: rassicurazione sull'esperienza crew + opzione guarantee
 * - EXTREME: suggerisce date alternative esplicitamente
 *
 * I testi sono in italiano (il sito e' italiano-first).
 */
export function getReassuranceMessage(risk: WeatherRisk): ReassuranceMessage {
  switch (risk) {
    case "LOW":
      return {
        title: "Condizioni ideali per navigare",
        body:
          "Mare calmo, tempo stabile. Preparati a una giornata perfetta alle Egadi.",
        showGuarantee: false,
        showAlternativeDates: false,
      };
    case "MEDIUM":
      return {
        title: "Mare leggermente mosso",
        body:
          "Il nostro skipper con anni di esperienza conosce le cale riparate per queste condizioni. " +
          "Navigheremo sul lato sottovento delle isole, regalandoti comunque una giornata memorabile.",
        showGuarantee: true,
        showAlternativeDates: false,
      };
    case "HIGH":
      return {
        title: "Condizioni impegnative",
        body:
          "La nostra crew monitora il mare ogni ora. Se le condizioni lo richiederanno, ti contatteremo " +
          "24 ore prima con opzioni: riprogrammazione gratuita o rimborso completo.",
        showGuarantee: true,
        showAlternativeDates: true,
      };
    case "EXTREME":
      return {
        title: "Mare difficilmente praticabile",
        body:
          "Per queste date consigliamo di valutare alternative. Ti mostriamo le 3 date piu' vicine con condizioni migliori, " +
          "oppure puoi prenotare con Weather Guarantee: rimborso 100% se non riusciamo a uscire.",
        showGuarantee: true,
        showAlternativeDates: true,
      };
  }
}
