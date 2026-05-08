import type { Metadata } from "next";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localizedPath } from "@/lib/i18n/paths";
import { CURRENT_POLICY_VERSION, EFFECTIVE_DATE } from "@/lib/legal/policy-version";
import {
  PRIVACY_CONTACT_EMAIL,
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_PHONE_TEXT,
  getEmailHref,
} from "@/lib/public-contact";

type TermsSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type TermsContent = {
  title: string;
  description: string;
  versionLabel: string;
  intro: string;
  summaryTitle: string;
  summaryDisclaimer: string;
  summaryItems: string[];
  indexTitle: string;
  sections: TermsSection[];
  legalLinksTitle: string;
  legalLinksIntro: string;
  privacyLabel: string;
  cookieLabel: string;
};

const companyIt = `${PUBLIC_COMPANY_LEGAL.name}, sede legale ${PUBLIC_COMPANY_LEGAL.legalAddress}, P.IVA ${PUBLIC_COMPANY_LEGAL.vatNumber}, PEC ${PUBLIC_COMPANY_LEGAL.pec}, Codice Univoco ${PUBLIC_COMPANY_LEGAL.recipientCode}`;
const companyEn = `${PUBLIC_COMPANY_LEGAL.name}, registered office ${PUBLIC_COMPANY_LEGAL.legalAddress}, VAT no. ${PUBLIC_COMPANY_LEGAL.vatNumber}, certified email ${PUBLIC_COMPANY_LEGAL.pec}, recipient code ${PUBLIC_COMPANY_LEGAL.recipientCode}`;
const companyEs = `${PUBLIC_COMPANY_LEGAL.name}, domicilio social ${PUBLIC_COMPANY_LEGAL.legalAddress}, NIF/IVA ${PUBLIC_COMPANY_LEGAL.vatNumber}, PEC ${PUBLIC_COMPANY_LEGAL.pec}, código destinatario ${PUBLIC_COMPANY_LEGAL.recipientCode}`;
const companyFr = `${PUBLIC_COMPANY_LEGAL.name}, siège social ${PUBLIC_COMPANY_LEGAL.legalAddress}, TVA ${PUBLIC_COMPANY_LEGAL.vatNumber}, PEC ${PUBLIC_COMPANY_LEGAL.pec}, code destinataire ${PUBLIC_COMPANY_LEGAL.recipientCode}`;
const EFFECTIVE_DATE_EN = "6 May 2026";
const EFFECTIVE_DATE_ES = "6 de mayo de 2026";
const EFFECTIVE_DATE_FR = "6 mai 2026";

const TERMS_IT: TermsContent = {
  title: "Termini e Condizioni",
  description:
    "Termini e condizioni di prenotazione Egadisailing per esperienze nautiche, cancellazioni, rimborsi, sicurezza, meteo e charter.",
  versionLabel: `Versione ${CURRENT_POLICY_VERSION} · In vigore dal ${EFFECTIVE_DATE}`,
  intro:
    "Questi Termini regolano le prenotazioni dirette effettuate tramite egadisailing.com. Prima del pagamento, il cliente dichiara di averli letti e accettati insieme alla Privacy Policy.",
  summaryTitle: "Riepilogo rapido",
  summaryDisclaimer:
    "Questo riepilogo aiuta la lettura ma non sostituisce le condizioni complete riportate sotto.",
  summaryItems: [
    "Cancellazione cliente: rimborso 100% fino a 30 giorni prima, 50% da 29 a 15 giorni prima, nessun rimborso sotto i 15 giorni e in caso di no-show.",
    "Il cambio data non è automatico: viene valutato dallo staff in base a disponibilità, operatività e sicurezza.",
    "Se Egadisailing annulla per meteo-mare non sicuro o minimo partecipanti non raggiunto, il cliente sceglie cambio data gratuito o rimborso integrale.",
    "La rotta, gli orari operativi, le soste e la barca impiegata possono variare per sicurezza, meteo, mare, ordinanze o esigenze tecniche.",
    "Il saldo non ancora pagato non viene richiesto dopo una cancellazione cliente; resta applicata la trattenuta sulla quota già pagata secondo la policy.",
  ],
  indexTitle: "Indice",
  legalLinksTitle: "Privacy, cookie e dati personali",
  legalLinksIntro:
    "Il trattamento dei dati personali e l'uso dei cookie sono regolati dai documenti dedicati:",
  privacyLabel: "Privacy Policy",
  cookieLabel: "Cookie Policy",
  sections: [
    {
      title: "1. Identità del professionista e contatti",
      paragraphs: [
        `Il venditore e prestatore dei servizi diretti è ${companyIt}.`,
        `Per assistenza contrattuale e prenotazioni: ${PUBLIC_CONTACT_EMAIL}. Per richieste privacy: ${PRIVACY_CONTACT_EMAIL}. Telefono/WhatsApp: ${PUBLIC_CONTACT_PHONE_TEXT}. Punto di incontro abituale, salvo diversa comunicazione operativa: ${PUBLIC_CONTACT_LOCATION.labelIt}.`,
      ],
    },
    {
      title: "2. Ambito dei Termini",
      bullets: [
        "Questi Termini si applicano alle prenotazioni dirette concluse su egadisailing.com o tramite procedure di pagamento diretto Egadisailing.",
        "Per prenotazioni effettuate su portali esterni, marketplace, agenzie o OTA, pagamento, cancellazione e rimborso seguono anzitutto le condizioni del portale di acquisto.",
        "Le regole operative di sicurezza, comportamento a bordo, documenti, puntualità, meteo e istruzioni dello skipper si applicano comunque a tutte le persone imbarcate.",
      ],
    },
    {
      title: "3. Natura dei servizi e data specifica",
      paragraphs: [
        "Egadisailing offre esperienze nautiche, tour, giornate private o condivise, esperienze gourmet e charter con data o periodo di esecuzione specifici.",
        "Le immagini, descrizioni di rotta, baie, orari e programmi presenti sul sito descrivono l'esperienza attesa, ma non garantiscono una rotta rigida o soste identiche in ogni uscita.",
      ],
    },
    {
      title: "4. Diritto di recesso e policy contrattuale",
      paragraphs: [
        "Ai sensi del Codice del Consumo, per i servizi riguardanti attività del tempo libero con data o periodo di esecuzione specifici il diritto di recesso ordinario di 14 giorni può essere escluso. Per le prenotazioni Egadisailing si applica quindi la policy contrattuale di cancellazione indicata in questi Termini.",
        "Prima di concludere l'ordine il cliente riceve le informazioni essenziali sul servizio, sul prezzo, sul professionista, sui contatti, sul pagamento e sulle principali condizioni di cancellazione.",
      ],
    },
    {
      title: "5. Prenotazione, prezzo, acconto e saldo",
      bullets: [
        "La prenotazione è conclusa quando il pagamento online richiesto va a buon fine e il sistema invia o rende disponibile la conferma.",
        "I prezzi sono espressi in Euro, IVA inclusa ove applicabile, salvo diversa indicazione nella scheda servizio.",
        "Per i servizi con acconto, la quota online blocca la prenotazione e il saldo residuo si paga in loco prima della partenza, salvo diversa indicazione scritta.",
        "Se dopo la prenotazione emerge un errore di prezzo manifestamente riconoscibile o un errore tecnico materiale, Egadisailing contatta il cliente per correggere l'ordine, proporre alternativa o rimborsare integralmente quanto pagato.",
        "Dopo una cancellazione cliente, Egadisailing non richiede il saldo non ancora pagato; resta applicata la trattenuta sulla quota già pagata secondo la policy di cancellazione.",
      ],
    },
    {
      title: "6. Cancellazione volontaria del cliente",
      bullets: [
        "Fino a 30 giorni prima della data di partenza: rimborso integrale dell'importo pagato online.",
        "Da 29 a 15 giorni prima della data di partenza: rimborso del 50% dell'importo pagato online.",
        "Sotto i 15 giorni dalla data di partenza: nessun rimborso.",
        "In caso di no-show o mancato imbarco imputabile al cliente: nessun rimborso.",
        "Eventuali commissioni o tempi tecnici del circuito di pagamento possono dipendere dal provider di pagamento e dalla banca del cliente.",
      ],
    },
    {
      title: "7. Cambio data richiesto dal cliente",
      paragraphs: [
        "Il cambio data non è un diritto automatico. Ogni richiesta è valutata dallo staff in base a disponibilità, tipo di servizio, meteo, operatività, stagionalità e compatibilità con le altre prenotazioni.",
        "Se il cambio data viene approvato, la policy di cancellazione resta ancorata alla data originale della prenotazione, salvo diverso accordo scritto di Egadisailing.",
      ],
    },
    {
      title: "8. Ritardi, check-in e no-show",
      bullets: [
        "Il cliente deve presentarsi al punto di incontro con anticipo rispetto all'orario comunicato.",
        "Egadisailing può concedere una tolleranza massima di 15 minuti, compatibilmente con traffico portuale, programma, meteo e rispetto degli altri ospiti.",
        "Decorso tale termine, la partenza può avvenire senza il cliente ritardatario e il ritardo è trattato come no-show, senza rimborso.",
        "Il cliente deve portare documento valido e ogni informazione richiesta per check-in, sicurezza o adempimenti amministrativi.",
      ],
    },
    {
      title: "9. Meteo, mare, sicurezza e cancellazioni Egadisailing",
      paragraphs: [
        "La sicurezza prevale sempre su itinerario, preferenze del cliente, programma commerciale e orari indicativi.",
        "Se Egadisailing annulla l'esperienza per condizioni meteo-marine non sicure, ordinanze, guasti, indisponibilità tecnica, impossibilità operativa o minimo partecipanti non raggiunto nei tour condivisi, il cliente può scegliere tra cambio data gratuito o rimborso integrale dell'importo pagato.",
        "Non danno automaticamente diritto a rimborso le variazioni di rotta, baie, soste, durata delle soste, orario operativo o barca equivalente quando l'esperienza resta erogabile in sicurezza.",
      ],
    },
    {
      title: "10. Itinerario, skipper authority e barca equivalente",
      bullets: [
        "Lo skipper/comandante decide rotta, velocità, soste, orari operativi, rada, eventuale rientro anticipato o modifica programma per sicurezza, comfort e normativa.",
        "Egadisailing può sostituire la barca con mezzo equivalente o superiore per motivi tecnici, meteo, logistici o di sicurezza.",
        "Le soste bagno, snorkeling, pranzo in rada, grotte, cale e destinazioni specifiche sono sempre subordinate a condizioni del giorno, affollamento, ordinanze e giudizio dello skipper.",
      ],
    },
    {
      title: "11. Cosa è incluso e cosa è escluso",
      bullets: [
        "Inclusi ed esclusi sono quelli indicati nella scheda servizio, nella conferma di prenotazione o in eventuale preventivo scritto.",
        "Salvo diversa indicazione, non sono inclusi transfer da/per hotel, parcheggio, extra non indicati, richieste speciali, cambusa charter, carburante extra fuori programma, tasse locali non previste o servizi di terzi.",
        "Richieste alimentari, allergie, intolleranze o esigenze particolari devono essere comunicate prima della partenza e sono soddisfatte nei limiti del possibile.",
      ],
    },
    {
      title: "12. Charter multi-giorno",
      bullets: [
        "Per i charter si applicano questi Termini più le condizioni specifiche indicate nella scheda servizio, nel preventivo o in eventuale allegato charter.",
        "La cambusa è esclusa salvo diversa indicazione scritta; la crew può supportare organizzazione, lista spesa o refill se concordato.",
        "Rotta, pernottamento in rada, isole visitate e durata delle navigazioni dipendono da meteo, mare, sicurezza e indicazioni dello skipper.",
        "Eventuali cauzioni, extra, skipper/hostess aggiuntivi, pulizie speciali, porti, ormeggi o servizi non inclusi sono dovuti solo se indicati o concordati per iscritto.",
      ],
    },
    {
      title: "13. Minori, condizioni fisiche, gravidanza e animali",
      bullets: [
        "Il cliente deve comunicare prima della partenza presenza di minori, gravidanza, disabilità, condizioni mediche rilevanti, difficoltà motorie, allergie o esigenze che possano incidere sulla sicurezza.",
        "Lo skipper può rifiutare o limitare l'imbarco se ritiene che condizioni del mare, barca, servizio scelto o stato del cliente non consentano un'esperienza sicura.",
        "Gli animali sono ammessi solo previa autorizzazione scritta dello staff, valutando barca, gruppo, meteo, igiene e sicurezza. Restano salvi i diritti applicabili per animali di assistenza ove previsti.",
      ],
    },
    {
      title: "14. Comportamento a bordo, alcol, fumo e danni",
      bullets: [
        "Il cliente deve rispettare le istruzioni di skipper e crew, usare correttamente dotazioni e non assumere comportamenti pericolosi o molesti.",
        "Fumo consentito solo se autorizzato e nelle zone indicate. Consumo di alcol ammesso solo in modo moderato; lo staff può limitarlo o interromperlo per sicurezza.",
        "Egadisailing può rifiutare imbarco, interrompere o modificare l'esperienza se un cliente mette a rischio se stesso, altri ospiti, crew, barca o ambiente.",
        "Il cliente risponde dei danni causati da condotta dolosa, negligente, imprudente o contraria alle istruzioni dello staff.",
      ],
    },
    {
      title: "15. Oggetti personali, assicurazione e responsabilità",
      paragraphs: [
        "Egadisailing dispone delle coperture assicurative previste dalla normativa applicabile. Il cliente resta responsabile dei propri effetti personali e deve custodire dispositivi, gioielli, denaro, documenti e oggetti di valore.",
        "Egadisailing non risponde di perdita, furto o danneggiamento di beni personali salvo dolo o colpa grave accertata.",
      ],
    },
    {
      title: "16. Foto, video e contenuti",
      paragraphs: [
        "Durante l'esperienza possono essere realizzate foto o video a fini operativi, di ricordo o assistenza. L'uso riconoscibile di immagini del cliente per marketing, social o comunicazione commerciale richiede consenso separato, libero e revocabile.",
      ],
    },
    {
      title: "17. Reclami, fattura e comunicazioni",
      bullets: [
        `Per reclami o richieste contrattuali il cliente può scrivere a ${PUBLIC_CONTACT_EMAIL} o alla PEC ${PUBLIC_COMPANY_LEGAL.pec}.`,
        "Eventuali reclami vanno inviati appena possibile e comunque con dettagli utili a identificare prenotazione, data, partecipanti e motivo.",
        "La fattura o ricevuta viene emessa secondo i dati forniti dal cliente e la normativa fiscale applicabile.",
        "Le comunicazioni transazionali possono essere inviate via email, telefono, WhatsApp o area prenotazione, in base ai contatti forniti dal cliente.",
      ],
    },
    {
      title: "18. Forza maggiore",
      paragraphs: [
        "Egadisailing non è responsabile per ritardi, modifiche o mancata esecuzione causati da eventi fuori dal proprio ragionevole controllo, inclusi condizioni meteo-marine, ordinanze, emergenze, scioperi, blocchi portuali, guasti improvvisi, indisponibilità di servizi essenziali o eventi di forza maggiore.",
      ],
    },
    {
      title: "19. Legge applicabile, foro e lingua",
      paragraphs: [
        "I Termini sono regolati dalla legge italiana. Per i consumatori si applicano i fori e le tutele inderogabili previste dalla normativa applicabile; negli altri casi il foro competente è Trapani.",
        "I Termini sono pubblicati in italiano e inglese. Entrambe le versioni sono fornite per chiarezza verso clienti italiani e internazionali; in caso di divergenza interpretativa, prevale il testo italiano.",
        "La piattaforma europea ODR per le controversie online è stata dismessa dal 20 luglio 2025; non viene quindi indicato alcun link ODR.",
      ],
    },
  ],
};

const TERMS_EN: TermsContent = {
  title: "Terms and Conditions",
  description:
    "Egadisailing booking terms for boat experiences, cancellations, refunds, safety, weather and charter services.",
  versionLabel: `Version ${CURRENT_POLICY_VERSION} · Effective from ${EFFECTIVE_DATE_EN}`,
  intro:
    "These Terms govern direct bookings made through egadisailing.com. Before payment, the customer confirms that they have read and accepted these Terms together with the Privacy Policy.",
  summaryTitle: "Quick summary",
  summaryDisclaimer:
    "This summary is provided for readability only and does not replace the full terms below.",
  summaryItems: [
    "Customer cancellation: 100% refund up to 30 days before departure, 50% refund from 29 to 15 days before departure, no refund under 15 days or in case of no-show.",
    "Date changes are not automatic: each request is reviewed by the crew according to availability, operations and safety.",
    "If Egadisailing cancels because of unsafe weather/sea conditions or because the minimum number of participants is not reached, the customer chooses a free date change or a full refund.",
    "Route, operating times, swim stops and the vessel used may change for safety, weather, sea conditions, orders from authorities or technical reasons.",
    "Any unpaid balance is not pursued after a customer cancellation; the refund or retention applies only to the amount already paid according to the cancellation policy.",
  ],
  indexTitle: "Contents",
  legalLinksTitle: "Privacy, cookies and personal data",
  legalLinksIntro:
    "Personal data processing and cookie use are governed by the dedicated documents:",
  privacyLabel: "Privacy Policy",
  cookieLabel: "Cookie Policy",
  sections: [
    {
      title: "1. Trader identity and contacts",
      paragraphs: [
        `The seller and direct service provider is ${companyEn}.`,
        `For contractual and booking support: ${PUBLIC_CONTACT_EMAIL}. For privacy requests: ${PRIVACY_CONTACT_EMAIL}. Phone/WhatsApp: ${PUBLIC_CONTACT_PHONE_TEXT}. Usual meeting point, unless otherwise communicated: ${PUBLIC_CONTACT_LOCATION.labelEn}.`,
      ],
    },
    {
      title: "2. Scope of these Terms",
      bullets: [
        "These Terms apply to direct bookings concluded on egadisailing.com or through Egadisailing direct payment procedures.",
        "For bookings made through external portals, marketplaces, agencies or OTAs, payment, cancellation and refund are primarily governed by the purchase portal's terms.",
        "Operational safety rules, conduct on board, documents, punctuality, weather and skipper instructions apply to all guests on board.",
      ],
    },
    {
      title: "3. Nature of the services and specific date",
      paragraphs: [
        "Egadisailing provides boat experiences, tours, private or shared days, gourmet experiences and charters scheduled for a specific date or period.",
        "Images, route descriptions, coves, times and programmes on the website describe the expected experience but do not guarantee a fixed route or identical stops on every departure.",
      ],
    },
    {
      title: "4. Withdrawal right and contractual cancellation policy",
      paragraphs: [
        "Under the Italian Consumer Code, the ordinary 14-day withdrawal right may be excluded for leisure activities scheduled for a specific date or period. Egadisailing bookings are therefore governed by the contractual cancellation policy set out in these Terms.",
        "Before placing the order, the customer receives the essential information about the service, price, trader, contacts, payment and main cancellation conditions.",
      ],
    },
    {
      title: "5. Booking, price, deposit and balance",
      bullets: [
        "The booking is concluded when the required online payment succeeds and the system sends or makes available the confirmation.",
        "Prices are shown in Euro and include VAT where applicable, unless otherwise stated on the service page.",
        "For services with a deposit, the online amount secures the booking and the remaining balance is paid on site before departure, unless otherwise agreed in writing.",
        "If a manifest pricing error or material technical error is found after booking, Egadisailing contacts the customer to correct the order, offer an alternative or fully refund the amount paid.",
        "After a customer cancellation, Egadisailing does not pursue any unpaid balance; the applicable retention concerns only the amount already paid under the cancellation policy.",
      ],
    },
    {
      title: "6. Voluntary customer cancellation",
      bullets: [
        "Up to 30 days before departure: full refund of the online amount paid.",
        "From 29 to 15 days before departure: 50% refund of the online amount paid.",
        "Under 15 days before departure: no refund.",
        "In case of no-show or missed boarding attributable to the customer: no refund.",
        "Provider or bank processing times and fees may depend on the payment provider and the customer's bank.",
      ],
    },
    {
      title: "7. Date change requested by the customer",
      paragraphs: [
        "A date change is not automatic. Each request is reviewed by the crew according to availability, service type, weather, operations, seasonality and compatibility with other bookings.",
        "If a date change is approved, the cancellation policy remains anchored to the original booking date unless Egadisailing agrees otherwise in writing.",
      ],
    },
    {
      title: "8. Delays, check-in and no-show",
      bullets: [
        "The customer must arrive at the meeting point in advance of the communicated time.",
        "Egadisailing may allow a maximum tolerance of 15 minutes, depending on port traffic, programme, weather and respect for other guests.",
        "After that tolerance, departure may take place without the late customer and the delay is treated as a no-show, without refund.",
        "The customer must bring a valid ID and any information required for check-in, safety or administrative purposes.",
      ],
    },
    {
      title: "9. Weather, sea conditions, safety and Egadisailing cancellations",
      paragraphs: [
        "Safety always prevails over itinerary, customer preferences, commercial programme and indicative times.",
        "If Egadisailing cancels the experience because of unsafe weather/sea conditions, authority orders, breakdowns, technical unavailability, operational impossibility or minimum participants not reached for shared tours, the customer may choose between a free date change or a full refund of the amount paid.",
        "Changes to route, coves, stops, stop duration, operating time or equivalent vessel do not automatically entitle the customer to a refund when the experience can still be safely provided.",
      ],
    },
    {
      title: "10. Itinerary, skipper authority and equivalent vessel",
      bullets: [
        "The skipper/captain decides route, speed, stops, operating times, anchorage, early return or programme changes for safety, comfort and legal compliance.",
        "Egadisailing may replace the vessel with an equivalent or superior one for technical, weather, logistical or safety reasons.",
        "Swim stops, snorkelling, lunch at anchor, caves, coves and specific destinations are always subject to daily conditions, crowding, authority orders and the skipper's judgement.",
      ],
    },
    {
      title: "11. What is included and excluded",
      bullets: [
        "Inclusions and exclusions are those stated on the service page, booking confirmation or written quote.",
        "Unless otherwise stated, hotel transfers, parking, unstated extras, special requests, charter provisioning, extra fuel outside the agreed programme, unforeseen local taxes and third-party services are not included.",
        "Dietary requests, allergies, intolerances or special needs must be communicated before departure and are accommodated where reasonably possible.",
      ],
    },
    {
      title: "12. Multi-day charter",
      bullets: [
        "Charters are governed by these Terms plus the specific conditions stated on the service page, quote or any charter annex.",
        "Provisioning is excluded unless otherwise agreed in writing; the crew may assist with shopping lists, provisioning or refills if agreed.",
        "Route, overnight anchorage, islands visited and navigation times depend on weather, sea conditions, safety and skipper instructions.",
        "Security deposits, extras, additional skipper/hostess, special cleaning, ports, moorings or services not included are payable only if stated or agreed in writing.",
      ],
    },
    {
      title: "13. Children, physical conditions, pregnancy and pets",
      bullets: [
        "The customer must inform Egadisailing before departure about children, pregnancy, disabilities, relevant medical conditions, mobility issues, allergies or needs that may affect safety.",
        "The skipper may refuse or limit boarding if sea conditions, vessel, selected service or the customer's condition do not allow a safe experience.",
        "Pets are allowed only with prior written crew approval, considering vessel, group, weather, hygiene and safety. Applicable rights for assistance animals remain unaffected where provided by law.",
      ],
    },
    {
      title: "14. Conduct on board, alcohol, smoking and damage",
      bullets: [
        "The customer must follow skipper and crew instructions, use equipment correctly and avoid dangerous or disruptive behaviour.",
        "Smoking is allowed only if authorised and in indicated areas. Alcohol consumption must remain moderate; the crew may limit or stop it for safety.",
        "Egadisailing may refuse boarding, interrupt or change the experience if a customer endangers themselves, other guests, crew, vessel or environment.",
        "The customer is responsible for damage caused by wilful, negligent, reckless conduct or conduct contrary to crew instructions.",
      ],
    },
    {
      title: "15. Personal belongings, insurance and liability",
      paragraphs: [
        "Egadisailing has the insurance coverage required by applicable law. The customer remains responsible for personal belongings and must keep devices, jewellery, cash, documents and valuables safe.",
        "Egadisailing is not liable for loss, theft or damage to personal belongings except in case of proven wilful misconduct or gross negligence.",
      ],
    },
    {
      title: "16. Photos, videos and content",
      paragraphs: [
        "Photos or videos may be taken during the experience for operational, memory or assistance purposes. Recognisable use of customer images for marketing, social media or commercial communication requires separate, free and revocable consent.",
      ],
    },
    {
      title: "17. Complaints, invoice and communications",
      bullets: [
        `For complaints or contractual requests, the customer may write to ${PUBLIC_CONTACT_EMAIL} or certified email ${PUBLIC_COMPANY_LEGAL.pec}.`,
        "Complaints should be sent as soon as possible and include details useful to identify the booking, date, guests and issue.",
        "Invoice or receipt is issued according to the data provided by the customer and applicable tax law.",
        "Transactional communications may be sent by email, phone, WhatsApp or booking area, according to the contacts provided by the customer.",
      ],
    },
    {
      title: "18. Force majeure",
      paragraphs: [
        "Egadisailing is not responsible for delays, changes or failure to perform caused by events outside its reasonable control, including weather/sea conditions, authority orders, emergencies, strikes, port restrictions, sudden breakdowns, unavailability of essential services or force majeure events.",
      ],
    },
    {
      title: "19. Applicable law, venue and language",
      paragraphs: [
        "These Terms are governed by Italian law. Consumers benefit from the mandatory venues and protections provided by applicable law; in all other cases the competent court is Trapani.",
        "These Terms are published in Italian and English. Both versions are provided for clarity towards Italian and international customers; in case of interpretative divergence, the Italian text prevails.",
        "The European ODR platform for online disputes was discontinued on 20 July 2025; no ODR link is therefore provided.",
      ],
    },
  ],
};

const TERMS_ES: TermsContent = {
  title: "Términos y condiciones",
  description:
    "Términos y condiciones de reserva Egadisailing para excursiones en barco, cancelaciones, reembolsos, seguridad, meteorología y charter.",
  versionLabel: `Versión ${CURRENT_POLICY_VERSION} · En vigor desde el ${EFFECTIVE_DATE_ES}`,
  intro:
    "Estos Términos regulan las reservas directas realizadas en egadisailing.com. Antes del pago, el cliente declara haberlos leído y aceptado junto con la Política de privacidad.",
  summaryTitle: "Resumen rápido",
  summaryDisclaimer:
    "Este resumen facilita la lectura, pero no sustituye las condiciones completas indicadas abajo.",
  summaryItems: [
    "Cancelación del cliente: reembolso del 100% hasta 30 días antes, 50% de 29 a 15 días antes, sin reembolso con menos de 15 días o no-show.",
    "El cambio de fecha no es automático: el equipo lo evalúa según disponibilidad, operativa y seguridad.",
    "Si Egadisailing cancela por meteorología/mar no seguro o mínimo de participantes no alcanzado, el cliente elige cambio de fecha gratuito o reembolso íntegro.",
    "Ruta, horarios, paradas y barco pueden variar por seguridad, meteorología, normativa o necesidades técnicas.",
    "Tras una cancelación del cliente, no se solicita el saldo no pagado; se aplica la retención sobre el importe ya abonado según la política.",
  ],
  indexTitle: "Índice",
  legalLinksTitle: "Privacidad, cookies y datos personales",
  legalLinksIntro:
    "El tratamiento de datos personales y el uso de cookies están regulados por los documentos dedicados:",
  privacyLabel: "Política de privacidad",
  cookieLabel: "Política de cookies",
  sections: [
    {
      title: "1. Identidad del profesional y contactos",
      paragraphs: [
        `El vendedor y prestador de los servicios directos es ${companyEs}.`,
        `Para asistencia contractual y reservas: ${PUBLIC_CONTACT_EMAIL}. Para solicitudes de privacidad: ${PRIVACY_CONTACT_EMAIL}. Teléfono/WhatsApp: ${PUBLIC_CONTACT_PHONE_TEXT}. Punto de encuentro habitual, salvo comunicación operativa distinta: ${PUBLIC_CONTACT_LOCATION.labelIt}.`,
      ],
    },
    {
      title: "2. Ámbito de aplicación",
      bullets: [
        "Estos Términos se aplican a reservas directas realizadas en egadisailing.com o mediante procedimientos de pago directo Egadisailing.",
        "Las reservas realizadas en portales externos, marketplaces, agencias u OTA siguen ante todo las condiciones del portal de compra.",
        "Las reglas de seguridad, puntualidad, comportamiento a bordo e instrucciones del patrón se aplican a todas las personas embarcadas.",
      ],
    },
    {
      title: "3. Naturaleza de los servicios",
      paragraphs: [
        "Egadisailing ofrece experiencias náuticas, tours, jornadas privadas o compartidas, experiencias gourmet y charter con fecha o periodo específico.",
        "Imágenes, rutas, bahías, horarios y programas describen la experiencia esperada, pero no garantizan una ruta rígida ni paradas idénticas en cada salida.",
      ],
    },
    {
      title: "4. Reserva, precio, depósito y saldo",
      bullets: [
        "La reserva queda concluida cuando el pago online solicitado se completa correctamente y el sistema envía o pone a disposición la confirmación.",
        "Los precios se expresan en euros, IVA incluido cuando corresponda, salvo indicación distinta en la ficha del servicio.",
        "En servicios con depósito, el importe online bloquea la reserva y el saldo se paga en destino antes de la salida, salvo indicación escrita distinta.",
        "Si aparece un error técnico o de precio manifiesto, Egadisailing contactará al cliente para corregir la orden, proponer alternativa o reembolsar lo pagado.",
      ],
    },
    {
      title: "5. Cancelación voluntaria del cliente",
      bullets: [
        "Hasta 30 días antes de la salida: reembolso íntegro del importe pagado online.",
        "De 29 a 15 días antes de la salida: reembolso del 50% del importe pagado online.",
        "Con menos de 15 días: sin reembolso.",
        "En caso de no-show o embarque no realizado por causa imputable al cliente: sin reembolso.",
      ],
    },
    {
      title: "6. Cambios de fecha, retrasos y no-show",
      paragraphs: [
        "El cambio de fecha no es un derecho automático. Cada solicitud se valora según disponibilidad, tipo de servicio, meteorología, operativa y otras reservas.",
        "El cliente debe presentarse en el punto de encuentro con antelación. Tras la tolerancia operativa comunicada, la salida puede realizarse sin el cliente retrasado y tratarse como no-show.",
      ],
    },
    {
      title: "7. Meteorología, mar y seguridad",
      paragraphs: [
        "La seguridad prevalece siempre sobre itinerario, preferencias del cliente, programa comercial y horarios orientativos.",
        "Si Egadisailing cancela por condiciones meteorológicas o marítimas no seguras, ordenanzas, averías, imposibilidad operativa o mínimo de participantes no alcanzado, el cliente puede elegir cambio de fecha gratuito o reembolso íntegro.",
        "Cambios de ruta, bahías, paradas, horarios o barco equivalente no dan automáticamente derecho a reembolso cuando la experiencia sigue siendo realizable con seguridad.",
      ],
    },
    {
      title: "8. Itinerario, autoridad del patrón y barco equivalente",
      bullets: [
        "El patrón decide ruta, velocidad, paradas, horarios, fondeo, regreso anticipado o cambios de programa por seguridad, comodidad y normativa.",
        "Egadisailing puede sustituir el barco por uno equivalente o superior por motivos técnicos, meteorológicos, logísticos o de seguridad.",
        "Baños, snorkel, comida a bordo al fondeo, cuevas, calas y destinos específicos dependen siempre de las condiciones del día.",
      ],
    },
    {
      title: "9. Qué está incluido, menores, salud y comportamiento",
      bullets: [
        "Incluidos y excluidos son los indicados en la ficha del servicio, confirmación de reserva o presupuesto escrito.",
        "Alergias, intolerancias, embarazo, discapacidad, condiciones médicas o presencia de menores deben comunicarse antes de la salida.",
        "El cliente debe respetar instrucciones de patrón y tripulación. Egadisailing puede rechazar el embarque o interrumpir la experiencia ante conductas peligrosas o molestas.",
      ],
    },
    {
      title: "10. Ley aplicable, jurisdicción e idioma",
      paragraphs: [
        "Estos Términos se rigen por la ley italiana. Los consumidores conservan los fueros y protecciones imperativas previstos por la normativa aplicable; en los demás casos el tribunal competente es Trapani.",
        "Los Términos se publican en italiano, inglés y español para facilitar la comprensión de clientes internacionales. En caso de divergencia interpretativa, prevalece el texto italiano.",
        "La plataforma europea ODR para litigios online fue cerrada el 20 de julio de 2025; por tanto no se indica ningún enlace ODR.",
      ],
    },
  ],
};

const TERMS_FR: TermsContent = {
  title: "Conditions générales",
  description:
    "Conditions générales de réservation Egadisailing pour excursions en bateau, annulations, remboursements, sécurité, météo et charter.",
  versionLabel: `Version ${CURRENT_POLICY_VERSION} · En vigueur depuis le ${EFFECTIVE_DATE_FR}`,
  intro:
    "Ces Conditions régissent les réservations directes effectuées sur egadisailing.com. Avant le paiement, le client déclare les avoir lues et acceptées avec la Politique de confidentialité.",
  summaryTitle: "Résumé rapide",
  summaryDisclaimer:
    "Ce résumé facilite la lecture mais ne remplace pas les conditions complètes ci-dessous.",
  summaryItems: [
    "Annulation client : remboursement 100 % jusqu'à 30 jours avant, 50 % de 29 à 15 jours avant, aucun remboursement sous 15 jours et en cas de no-show.",
    "Le changement de date n'est pas automatique : il est évalué selon disponibilité, organisation et sécurité.",
    "Si Egadisailing annule pour météo/mer non sûre ou minimum de participants non atteint, le client choisit changement de date gratuit ou remboursement intégral.",
    "Route, horaires, arrêts et bateau peuvent varier pour sécurité, météo, mer, ordonnances ou raisons techniques.",
    "Le solde non encore payé n'est pas demandé après une annulation client ; la retenue sur l'acompte déjà payé suit la policy.",
  ],
  indexTitle: "Sommaire",
  legalLinksTitle: "Confidentialité, cookies et données personnelles",
  legalLinksIntro:
    "Le traitement des données personnelles et l'utilisation des cookies sont régis par les documents dédiés :",
  privacyLabel: "Politique de confidentialité",
  cookieLabel: "Politique de cookies",
  sections: [
    {
      title: "1. Identité du professionnel et contacts",
      paragraphs: [
        `Le vendeur et prestataire des services directs est ${companyFr}.`,
        `Pour assistance contractuelle et réservations : ${PUBLIC_CONTACT_EMAIL}. Pour demandes privacy : ${PRIVACY_CONTACT_EMAIL}. Téléphone/WhatsApp : ${PUBLIC_CONTACT_PHONE_TEXT}. Point de rencontre habituel, sauf communication opérationnelle différente : ${PUBLIC_CONTACT_LOCATION.labelFr}.`,
      ],
    },
    {
      title: "2. Champ d'application",
      bullets: [
        "Ces Conditions s'appliquent aux réservations directes conclues sur egadisailing.com ou via procédures de paiement direct Egadisailing.",
        "Pour les réservations effectuées via portails externes, marketplaces, agences ou OTA, paiement, annulation et remboursement suivent d'abord les conditions du canal d'achat.",
        "Les règles de sécurité, comportement à bord, documents, ponctualité, météo et instructions du skipper s'appliquent à toutes les personnes embarquées.",
      ],
    },
    {
      title: "3. Nature des services et date spécifique",
      paragraphs: [
        "Egadisailing propose des expériences nautiques, excursions, journées privées ou partagées, expériences gourmet et charters avec date ou période d'exécution spécifique.",
        "Images, descriptions de route, criques, horaires et programmes décrivent l'expérience attendue, mais ne garantissent pas une route rigide ou des arrêts identiques à chaque sortie.",
      ],
    },
    {
      title: "4. Droit de rétractation et policy contractuelle",
      bullets: [
        "Les services touristiques et de loisir fournis à une date ou période spécifique peuvent être exclus du droit de rétractation prévu pour les contrats à distance.",
        "Les annulations, remboursements et changements suivent donc la policy contractuelle indiquée dans ces Conditions et dans la confirmation de réservation.",
      ],
    },
    {
      title: "5. Paiements, acompte, solde et confirmations",
      bullets: [
        "Les montants, taxes incluses le cas échéant, acompte, solde et échéances sont indiqués avant le paiement.",
        "Le paiement est traité par Stripe ou par les moyens indiqués. Egadisailing ne conserve pas les données complètes de carte.",
        "La réservation est confirmée uniquement après paiement ou confirmation écrite de l'équipe.",
      ],
    },
    {
      title: "6. Annulation client, no-show et changement de date",
      bullets: [
        "Jusqu'à 30 jours avant la date : remboursement intégral des sommes payées.",
        "De 29 à 15 jours avant : remboursement de 50 % des sommes payées.",
        "Moins de 15 jours avant ou no-show : aucun remboursement.",
        "Le changement de date est soumis à disponibilité, météo, organisation et accord de l'équipe.",
      ],
    },
    {
      title: "7. Annulation ou modification par Egadisailing",
      bullets: [
        "Egadisailing peut annuler, reporter ou modifier l'expérience en cas de météo/mer non sûre, panne, force majeure, ordonnances, sécurité ou minimum de participants non atteint.",
        "Dans ces cas, lorsque l'expérience ne peut pas être effectuée, le client peut choisir un changement de date gratuit ou un remboursement intégral des sommes payées.",
      ],
    },
    {
      title: "8. Météo, sécurité, skipper, route et bateau",
      bullets: [
        "Le skipper décide route, vitesse, arrêts, horaires, mouillage, retour anticipé ou changements de programme pour sécurité, confort et réglementation.",
        "Egadisailing peut remplacer le bateau par un bateau équivalent ou supérieur pour raisons techniques, météo, logistiques ou de sécurité.",
        "Baignades, snorkeling, déjeuner à bord au mouillage, grottes, criques et destinations spécifiques dépendent toujours des conditions du jour.",
      ],
    },
    {
      title: "9. Inclus, mineurs, santé et comportement",
      bullets: [
        "Inclus et exclus sont ceux indiqués dans la fiche du service, la confirmation de réservation ou le devis écrit.",
        "Allergies, intolérances, grossesse, handicap, conditions médicales ou présence de mineurs doivent être communiqués avant le départ.",
        "Le client doit respecter les instructions du skipper et de l'équipage. Egadisailing peut refuser l'embarquement ou interrompre l'expérience en cas de comportement dangereux ou gênant.",
      ],
    },
    {
      title: "10. Loi applicable, juridiction et langue",
      paragraphs: [
        "Ces Conditions sont régies par le droit italien. Les consommateurs conservent les protections impératives prévues par la réglementation applicable ; dans les autres cas, le tribunal compétent est Trapani.",
        "Les Conditions sont publiées en italien, anglais, espagnol et français pour faciliter la compréhension des clients internationaux. En cas de divergence d'interprétation, le texte italien prévaut.",
        "La plateforme européenne ODR pour les litiges en ligne a fermé le 20 juillet 2025 ; aucun lien ODR n'est donc indiqué.",
      ],
    },
  ],
};

function getContent(locale: string): TermsContent {
  if (locale === "es") return TERMS_ES;
  if (locale === "fr") return TERMS_FR;
  return locale === "en" ? TERMS_EN : TERMS_IT;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getContent(locale);
  return buildPageMetadata({
    title: content.title,
    description: content.description,
    path: "/terms",
    locale,
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const content = getContent(locale);
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";

  return (
    <OceanLayout padding="sm" className="egadi-water-reflection overflow-hidden">
      <article className="relative z-10 mx-auto mt-20 max-w-4xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-white/20 sm:p-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            Egadisailing
          </p>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">{content.title}</h1>
          <p className="text-sm text-slate-500">{content.versionLabel}</p>
          <p className="max-w-3xl text-base leading-7 text-slate-700">{content.intro}</p>
        </header>

        <section className="mt-8 rounded-2xl border border-sky-100 bg-sky-50 p-5">
          <h2 className="text-lg font-bold text-slate-950">{content.summaryTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{content.summaryDisclaimer}</p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-800">
            {content.summaryItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-700" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <nav className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-bold text-slate-950">{content.indexTitle}</h2>
          <ol className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {content.sections.map((section) => (
              <li key={section.title}>
                <a href={`#section-${section.title.split(".")[0]}`} className="hover:text-sky-700">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-9">
          {content.sections.map((section) => (
            <section
              key={section.title}
              id={`section-${section.title.split(".")[0]}`}
              className="scroll-mt-24 border-t border-slate-200 pt-7"
            >
              <h2 className="text-xl font-bold text-slate-950">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-700">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-bold text-slate-950">{content.legalLinksTitle}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">{content.legalLinksIntro}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={localizedPath(locale, "/privacy")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {content.privacyLabel}
            </a>
            <a
              href={localizedPath(locale, "/cookie-policy")}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {content.cookieLabel}
            </a>
            <a
              href={getEmailHref()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {isEs ? "Contáctanos" : isFr ? "Nous contacter" : isEn ? "Contact us" : "Contattaci"}
            </a>
          </div>
        </section>
      </article>
    </OceanLayout>
  );
}
