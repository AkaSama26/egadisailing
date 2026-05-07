import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { CURRENT_POLICY_VERSION, EFFECTIVE_DATE } from "@/lib/legal/policy-version";
import {
  PUBLIC_COMPANY_LEGAL,
  PRIVACY_CONTACT_EMAIL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_TECHNICAL_MAINTAINER,
  getEmailHref,
} from "@/lib/public-contact";

const sectionClass =
  "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 md:p-8";
const eyebrowClass = "text-xs font-bold uppercase tracking-[0.18em] text-[#d97706]";
const headingClass = "mt-2 text-2xl font-bold tracking-tight text-slate-950";
const paragraphClass = "mt-4 text-sm leading-7 text-slate-700 md:text-base";
const listClass = "mt-5 space-y-3 text-sm leading-7 text-slate-700 md:text-base";

function LegalTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-slate-200 px-4 py-3 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="min-w-[12rem] px-4 py-4 align-top leading-6">{children}</td>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return buildPageMetadata({
    title: isEn ? "Privacy Policy" : "Informativa privacy",
    description: isEn
      ? "Egadisailing Privacy Policy for bookings, payments, contact requests, cookies, security and third-party services used by the platform."
      : "Informativa privacy di Egadisailing su prenotazioni, pagamenti, contatti, cookie, sicurezza e servizi terzi utilizzati dall'app.",
    path: "/privacy",
    locale,
  });
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071934_0%,#0b3154_22rem,#f8fafc_22rem,#ffffff_100%)] px-4 pb-20 pt-32 sm:px-6">
      <article className="mx-auto max-w-5xl">
        <header className="pb-10 text-white">
          <p className={eyebrowClass}>Informativa privacy</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Privacy Policy Egadisailing
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
            Come trattiamo i dati personali raccolti tramite sito, prenotazioni,
            pagamenti, contatti, recupero prenotazione, sicurezza e manutenzione tecnica.
          </p>
          <p className="mt-4 text-sm text-white/55">
            Versione {CURRENT_POLICY_VERSION} · In vigore dal {EFFECTIVE_DATE}
          </p>
        </header>

        <div className="space-y-6">
          <section className={sectionClass}>
            <p className={eyebrowClass}>Titolare</p>
            <h2 className={headingClass}>1. Titolare del trattamento</h2>
            <p className={paragraphClass}>
              Il titolare del trattamento è <strong>{PUBLIC_COMPANY_LEGAL.name}</strong>,
              con sede legale in {PUBLIC_COMPANY_LEGAL.legalAddress}, P.IVA{" "}
              {PUBLIC_COMPANY_LEGAL.vatNumber}, PEC{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PUBLIC_COMPANY_LEGAL.pec)}>
                {PUBLIC_COMPANY_LEGAL.pec}
              </a>
              , Codice Univoco {PUBLIC_COMPANY_LEGAL.recipientCode}. Per informazioni,
              richieste privacy e assistenza puoi scrivere a{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PRIVACY_CONTACT_EMAIL)}>
                {PUBLIC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Software e manutenzione</p>
            <h2 className={headingClass}>2. Fornitore tecnico dell&apos;applicazione</h2>
            <p className={paragraphClass}>
              Il codice, il database, i deploy, la manutenzione tecnica e il supporto
              applicativo della piattaforma sono gestiti da{" "}
              <strong>{PUBLIC_TECHNICAL_MAINTAINER.name}</strong>, P.IVA{" "}
              {PUBLIC_TECHNICAL_MAINTAINER.vatNumber}, sede legale in{" "}
              {PUBLIC_TECHNICAL_MAINTAINER.legalAddress}, PEC{" "}
              <a
                className="font-semibold text-[#0b6694]"
                href={getEmailHref(PUBLIC_TECHNICAL_MAINTAINER.pec)}
              >
                {PUBLIC_TECHNICAL_MAINTAINER.pec}
              </a>
              . Marweb opera per conto di Egadisailing quale responsabile del
              trattamento ai sensi dell&apos;art. 28 GDPR, sulla base di apposito
              accordo di nomina, quando accede o tratta dati personali per
              manutenzione, assistenza, sicurezza, backup, gestione database o interventi
              applicativi.
            </p>
            <p className={paragraphClass}>
              Marweb non decide finalità e mezzi commerciali del trattamento: queste
              decisioni restano in capo a Egadisailing. L&apos;accesso ai dati avviene nei
              limiti necessari a mantenere sicura e funzionante l&apos;applicazione. I
              sub-fornitori tecnici utilizzati da Marweb sono indicati nella sezione sui
              destinatari e sub-responsabili.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Categorie di dati</p>
            <h2 className={headingClass}>3. Dati personali trattati</h2>
            <ul className={listClass}>
              <li>
                <strong>Prenotazioni:</strong> nome, cognome, email, telefono, eventuale
                nazionalità e lingua preferita, esperienza scelta, barca, data, numero e
                tipologia dei partecipanti, importi, stato della prenotazione, codice
                prenotazione, note inserite dal cliente e consensi privacy/termini.
              </li>
              <li>
                <strong>Pagamenti:</strong> importo, valuta, stato del pagamento,
                riferimenti tecnici Stripe come PaymentIntent, Checkout Session, charge o
                refund. I dati completi della carta non vengono salvati sui server
                Egadisailing.
              </li>
              <li>
                <strong>Modulo contatti:</strong> nome, email, telefono se indicato,
                oggetto e messaggio.
              </li>
              <li>
                <strong>Recupero prenotazione:</strong> email, codice OTP in forma hash,
                sessione temporanea, indirizzo IP e user-agent per sicurezza.
              </li>
              <li>
                <strong>Cookie e preferenze:</strong> identificativo del consenso,
                categorie accettate o rifiutate, servizi attivati, versione della policy,
                hash della configurazione mostrata, hash dell&apos;IP e user-agent.
              </li>
              <li>
                <strong>Dati tecnici e sicurezza:</strong> indirizzo IP, user-agent, log
                applicativi, rate limit, errori tecnici, token di sessione e dati minimi
                per prevenire abusi, spam, frodi e accessi non autorizzati.
              </li>
              <li>
                <strong>Interesse sulla pagina esperienza:</strong> l&apos;app può usare un
                identificativo locale pseudonimo del browser per stimare quante persone
                stanno visitando una pagina esperienza. Sul server il valore viene
                trasformato in hash e ha durata breve.
              </li>
              <li>
                <strong>Canali partner:</strong> se la prenotazione arriva da piattaforme
                esterne, possono essere trattati dati ricevuti da Bokun, Boataround,
                SamBoat, Click&Boat, Nautal o altri canali collegati.
              </li>
            </ul>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Perché li usiamo</p>
            <h2 className={headingClass}>4. Finalità e basi giuridiche</h2>
            <LegalTable headers={["Finalità", "Base giuridica"]}>
              <tr>
                <Td>Gestire richieste, preventivi e comunicazioni precontrattuali</Td>
                <Td>Esecuzione di misure precontrattuali - art. 6.1.b GDPR</Td>
              </tr>
              <tr>
                <Td>Creare e gestire prenotazioni, pagamenti, saldo e assistenza cliente</Td>
                <Td>Esecuzione del contratto - art. 6.1.b GDPR</Td>
              </tr>
              <tr>
                <Td>Inviare email transazionali: conferme, promemoria, rimborsi, modifiche</Td>
                <Td>Esecuzione del contratto e obblighi di servizio</Td>
              </tr>
              <tr>
                <Td>Adempimenti fiscali, contabili, amministrativi e obblighi di legge</Td>
                <Td>Obbligo legale - art. 6.1.c GDPR</Td>
              </tr>
              <tr>
                <Td>Sicurezza, prevenzione frodi, anti-spam, rate limit e audit tecnico</Td>
                <Td>Legittimo interesse - art. 6.1.f GDPR</Td>
              </tr>
              <tr>
                <Td>Cookie analitici e marketing, se configurati e accettati</Td>
                <Td>Consenso - art. 6.1.a GDPR e normativa ePrivacy</Td>
              </tr>
              <tr>
                <Td>Difesa di diritti in sede giudiziale o stragiudiziale</Td>
                <Td>Legittimo interesse e obblighi di legge</Td>
              </tr>
            </LegalTable>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Destinatari</p>
            <h2 className={headingClass}>5. Servizi, fornitori e partner</h2>
            <p className={paragraphClass}>
              I dati possono essere comunicati a fornitori tecnici e partner necessari al
              funzionamento del servizio, sempre nei limiti delle rispettive finalità:
            </p>
            <ul className={listClass}>
              <li>
                <strong>{PUBLIC_TECHNICAL_MAINTAINER.name}</strong> per sviluppo,
                manutenzione, gestione codice, database, deploy, sicurezza e supporto
                applicativo, in qualità di responsabile del trattamento.
              </li>
              <li>
                <strong>OVH Cloud</strong> per VPS, database e backup ospitati
                sull&apos;infrastruttura tecnica della piattaforma.
              </li>
              <li>
                <strong>Cloudflare</strong> per DNS, sicurezza, protezione anti-abuso,
                proxy/CDN ove attivo e servizi esterni caricati dal sito.
              </li>
              <li>
                <strong>IONOS</strong> per dominio e servizi collegati al dominio.
              </li>
              <li>
                <strong>GitHub</strong> per repository del codice, versionamento,
                collaborazione tecnica e, ove configurato, processi di deploy.
              </li>
              <li>
                <strong>Stripe</strong> per pagamenti, prevenzione frodi, ricevute e
                rimborsi.
              </li>
              <li>
                <strong>Brevo</strong> per email transazionali e messaggi di servizio.
              </li>
              <li>
                <strong>Cloudflare Turnstile</strong> per verifiche anti-bot nei moduli e
                nel checkout.
              </li>
              <li>
                <strong>Telegram</strong> per notifiche operative all&apos;amministrazione,
                se configurato.
              </li>
              <li>
                <strong>Google Maps</strong> e altri servizi esterni incorporati o linkati,
                quando vengono caricati dal sito o aperti dall&apos;utente.
              </li>
              <li>
                <strong>Google Analytics 4, Google Ads, Meta Pixel e Bing</strong> se
                configurati e, per gli strumenti non tecnici, solo dopo consenso.
              </li>
              <li>
                <strong>Sentry</strong>, solo se verrà abilitato, per monitoraggio errori e
                stabilità applicativa con riduzione dei dati personali inviati. Alla data
                di questa versione non risulta attivo nell&apos;ambiente applicativo.
              </li>
              <li>
                <strong>Bokun, Boataround, SamBoat, Click&Boat, Nautal</strong> e altri
                canali OTA o charter collegati, quando la prenotazione nasce o deve essere
                sincronizzata su quei canali.
              </li>
              <li>
                <strong>Open-Meteo</strong> se configurato, per dati meteo tecnici usati a
                supporto dell&apos;operatività e senza invio volontario di dati identificativi
                dei clienti.
              </li>
              <li>
                Consulenti fiscali, amministrativi, legali e soggetti che supportano
                Egadisailing nella gestione operativa del servizio.
              </li>
            </ul>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Trasferimenti</p>
            <h2 className={headingClass}>6. Trasferimenti fuori dallo SEE</h2>
            <p className={paragraphClass}>
              Alcuni fornitori, ad esempio Stripe, Cloudflare, Google, Meta, GitHub,
              Telegram o Sentry se abilitato, possono trattare dati anche fuori dallo
              Spazio Economico Europeo. In questi casi il trasferimento avviene sulla base
              degli strumenti previsti dal GDPR, come decisioni di adeguatezza, EU-US Data
              Privacy Framework ove applicabile, clausole contrattuali standard o altre
              garanzie appropriate.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Durata</p>
            <h2 className={headingClass}>7. Conservazione</h2>
            <ul className={listClass}>
              <li>Dati di prenotazione, pagamenti e documentazione amministrativa: fino a 10 anni.</li>
              <li>
                Consensi privacy, termini e tracciamento delle accettazioni: per il tempo
                necessario a dimostrare la conformità e tutelare i diritti delle parti.
              </li>
              <li>Codici OTP usati o scaduti: cancellazione programmata dopo 30 giorni.</li>
              <li>Sessioni di recupero prenotazione scadute: cancellazione dopo 90 giorni.</li>
              <li>Rate limit e dati tecnici anti-abuso: cancellazione indicativa dopo 7 giorni.</li>
              <li>Cache meteo: 14 giorni.</li>
              <li>Log di audit applicativo: fino a 24 mesi.</li>
              <li>
                Payload ricevuti da canali partner: riduzione o anonimizzazione dei dati
                personali non più necessari dopo circa 90 giorni.
              </li>
              <li>
                Indicatori temporanei di presenza pagina: lato server durano pochi minuti;
                lato browser l&apos;identificativo locale resta finché non viene cancellato
                dall&apos;utente o dal browser.
              </li>
            </ul>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Cookie</p>
            <h2 className={headingClass}>8. Cookie e strumenti simili</h2>
            <p className={paragraphClass}>
              Per informazioni dettagliate su cookie tecnici, strumenti anti-bot, pagamenti,
              local storage, session storage e tracker opzionali consulta la{" "}
              <Link className="font-semibold text-[#0b6694]" href="/cookie-policy">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Diritti</p>
            <h2 className={headingClass}>9. Diritti dell&apos;interessato</h2>
            <p className={paragraphClass}>
              Ai sensi degli artt. 15-22 GDPR puoi chiedere accesso, rettifica,
              cancellazione, limitazione, portabilità, opposizione al trattamento e revoca
              del consenso quando il trattamento si basa sul consenso. Alcuni dati non
              possono essere cancellati subito se devono essere conservati per obblighi
              fiscali, contabili, sicurezza o difesa di diritti.
            </p>
            <p className={paragraphClass}>
              Per esercitare i diritti scrivi a{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PRIVACY_CONTACT_EMAIL)}>
                {PUBLIC_CONTACT_EMAIL}
              </a>
              , indicando se possibile il codice prenotazione o l&apos;email usata per il
              contatto.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Autorità</p>
            <h2 className={headingClass}>10. Reclami e aggiornamenti</h2>
            <p className={paragraphClass}>
              Puoi proporre reclamo al Garante per la Protezione dei Dati Personali tramite
              il sito{" "}
              <a
                className="font-semibold text-[#0b6694]"
                href="https://www.garanteprivacy.it"
                rel="noopener noreferrer"
                target="_blank"
              >
                garanteprivacy.it
              </a>
              .
            </p>
            <p className={paragraphClass}>
              La presente informativa può essere aggiornata in caso di modifiche tecniche,
              normative o organizzative. La versione pubblicata in questa pagina indica la
              data di entrata in vigore.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
