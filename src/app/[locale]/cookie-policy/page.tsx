import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_EFFECTIVE_DATE,
  hasOptionalCookieConsentServices,
} from "@/lib/cookie-consent/policy";
import { getCookieConsentPublicServices } from "@/lib/cookie-consent/server";
import { getSiteVerificationConfig } from "@/lib/site-verification";
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
    title: isEn ? "Cookie Policy" : "Cookie Policy",
    description: isEn
      ? "Egadisailing Cookie Policy: technical cookies, consent choices, booking sessions, Stripe payments, Cloudflare, Google Maps and optional trackers."
      : "Cookie Policy Egadisailing: cookie tecnici, consenso, sessioni, pagamenti Stripe, Cloudflare, Google Maps e tracker opzionali solo dopo consenso.",
    path: "/cookie-policy",
    locale,
  });
}

export default function CookiePolicyPage() {
  const services = getCookieConsentPublicServices();
  const hasOptionalServices = hasOptionalCookieConsentServices(services);
  const siteVerification = getSiteVerificationConfig();
  const hasVerificationTags = Boolean(
    siteVerification.googleSiteVerification ||
      siteVerification.bingSiteVerification ||
      siteVerification.metaDomainVerification,
  );
  const localStorageSectionNumber = hasVerificationTags ? "4" : "3";
  const optionalSectionNumber = hasVerificationTags ? "5" : "4";
  const servicesSectionNumber = hasVerificationTags ? "6" : "5";
  const consentSectionNumber = hasVerificationTags ? "7" : "6";
  const browserSectionNumber = hasVerificationTags ? "8" : "7";
  const contactsSectionNumber = hasVerificationTags ? "9" : "8";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071934_0%,#0b3154_22rem,#f8fafc_22rem,#ffffff_100%)] px-4 pb-20 pt-32 sm:px-6">
      <article className="mx-auto max-w-5xl">
        <header className="pb-10 text-white">
          <p className={eyebrowClass}>Preferenze e strumenti tecnici</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Cookie Policy Egadisailing
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
            Cookie tecnici, sessioni, consenso, local storage, pagamenti, anti-bot,
            mappe, servizi esterni e strumenti opzionali caricati solo dopo consenso.
          </p>
          <p className="mt-4 text-sm text-white/55">
            In vigore dal {COOKIE_CONSENT_EFFECTIVE_DATE}
          </p>
        </header>

        <div className="space-y-6">
          <section className={sectionClass}>
            <p className={eyebrowClass}>Introduzione</p>
            <h2 className={headingClass}>1. Cosa sono cookie e strumenti simili</h2>
            <p className={paragraphClass}>
              I cookie sono piccoli file salvati dal browser. Alcuni sono indispensabili
              per far funzionare il sito; altri possono misurare visite o campagne
              pubblicitarie. L&apos;app può usare anche local storage e session storage per
              salvare preferenze temporanee o identificativi tecnici.
            </p>
            <p className={paragraphClass}>
              Egadisailing usa cookie tecnici necessari per navigazione, lingua, sicurezza,
              sessioni, recupero prenotazione, pagamenti e protezione anti-bot. Eventuali
              strumenti analitici, marketing o misurazione campagne vengono caricati solo
              dopo il tuo consenso.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Sempre attivi</p>
            <h2 className={headingClass}>2. Cookie tecnici e necessari</h2>
            <p className={paragraphClass}>
              Questi strumenti sono necessari per fornire il servizio o proteggerlo. Non
              richiedono consenso preventivo e non possono essere disattivati dal pannello
              preferenze del sito.
            </p>
            <LegalTable headers={["Nome", "Fornitore", "Finalità", "Durata"]}>
              <tr>
                <Td>
                  <code>{COOKIE_CONSENT_COOKIE_NAME}</code>
                </Td>
                <Td>Egadisailing</Td>
                <Td>Memorizza le preferenze cookie espresse dall&apos;utente</Td>
                <Td>6 mesi</Td>
              </tr>
              <tr>
                <Td>
                  <code>NEXT_LOCALE</code>
                </Td>
                <Td>Egadisailing</Td>
                <Td>Memorizza la lingua selezionata</Td>
                <Td>1 anno</Td>
              </tr>
              <tr>
                <Td>
                  <code>egadi_cache_reset</code>
                </Td>
                <Td>Egadisailing</Td>
                <Td>Evita problemi da vecchi service worker o cache precedenti</Td>
                <Td>30 giorni</Td>
              </tr>
              <tr>
                <Td>
                  <code>egadi-booking-session</code>
                </Td>
                <Td>Egadisailing</Td>
                <Td>Sessione dell&apos;area cliente per recuperare e consultare la prenotazione</Td>
                <Td>7 giorni</Td>
              </tr>
              <tr>
                <Td>
                  <code>authjs.session-token</code> /{" "}
                  <code>__Secure-authjs.session-token</code>
                </Td>
                <Td>Auth.js / Egadisailing</Td>
                <Td>Sessione sicura dell&apos;area amministrativa</Td>
                <Td>Fino a 8 ore</Td>
              </tr>
              <tr>
                <Td>
                  <code>authjs.csrf-token</code>, <code>authjs.callback-url</code>
                </Td>
                <Td>Auth.js / Egadisailing</Td>
                <Td>Sicurezza del login amministrativo e ritorno alla pagina richiesta</Td>
                <Td>Sessione o breve durata tecnica</Td>
              </tr>
              <tr>
                <Td>
                  <code>__stripe_mid</code>, <code>__stripe_sid</code>, <code>m</code>
                </Td>
                <Td>Stripe</Td>
                <Td>Pagamenti, prevenzione frodi e sicurezza del checkout</Td>
                <Td>Variabile, secondo policy Stripe</Td>
              </tr>
              <tr>
                <Td>Nomi variabili Cloudflare</Td>
                <Td>Cloudflare Turnstile</Td>
                <Td>Verifica anti-bot nei moduli e nel checkout</Td>
                <Td>Variabile, secondo policy Cloudflare</Td>
              </tr>
              <tr>
                <Td>Nomi variabili Google Maps</Td>
                <Td>Google</Td>
                <Td>Caricamento della mappa incorporata nella pagina contatti</Td>
                <Td>Variabile, secondo policy Google</Td>
              </tr>
            </LegalTable>
          </section>

          {hasVerificationTags && (
            <section className={sectionClass}>
              <p className={eyebrowClass}>Verifica dominio</p>
              <h2 className={headingClass}>3. Tag di verifica proprietà</h2>
              <p className={paragraphClass}>
                Il sito può includere meta tag tecnici per verificare la proprietà del
                dominio su Google Search Console, Bing Webmaster Tools e Meta Business.
                Questi tag sono presenti nel codice HTML, non impostano cookie e non
                attivano tracciamento pubblicitario.
              </p>
            </section>
          )}

          <section className={sectionClass}>
            <p className={eyebrowClass}>Browser storage</p>
            <h2 className={headingClass}>
              {localStorageSectionNumber}. Local storage e session storage
            </h2>
            <p className={paragraphClass}>
              Alcune preferenze sono salvate nel browser con tecnologie simili ai cookie.
              Puoi cancellarle dalle impostazioni del browser.
            </p>
            <LegalTable headers={["Chiave", "Finalità", "Durata"]}>
              <tr>
                <Td>
                  <code>egadisailing:presence-visitor-id</code>
                </Td>
                <Td>
                  Identificativo pseudonimo usato per stimare l&apos;interesse sulla pagina
                  esperienza. Sul server viene trasformato in hash e resta solo per pochi
                  minuti.
                </Td>
                <Td>Finché non viene cancellato dal browser</Td>
              </tr>
              <tr>
                <Td>
                  <code>egadi-choice-dialog-dismissed</code>
                </Td>
                <Td>Ricorda nella sessione se il dialog di scelta esperienza è stato chiuso</Td>
                <Td>Sessione browser</Td>
              </tr>
              <tr>
                <Td>
                  <code>egadisailing:inline-service-worker-cleanup:*</code>
                </Td>
                <Td>Segna il completamento della pulizia di vecchie cache/service worker</Td>
                <Td>Sessione browser</Td>
              </tr>
            </LegalTable>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Solo con consenso</p>
            <h2 className={headingClass}>
              {optionalSectionNumber}. Cookie opzionali solo dopo consenso
            </h2>
            {hasOptionalServices ? (
              <LegalTable headers={["Fornitore", "Cookie indicativi", "Finalità", "Durata"]}>
                {services.gaMeasurementId && (
                  <tr>
                    <Td>Google Analytics 4</Td>
                    <Td>
                      <code>_ga</code>, <code>_ga_*</code>, <code>_gid</code>
                    </Td>
                    <Td>
                      Misurazione aggregata delle visite e delle performance del sito, con
                      configurazione di anonimizzazione IP
                    </Td>
                    <Td>Fino a 2 anni</Td>
                  </tr>
                )}
                {services.googleAdsId && (
                  <tr>
                    <Td>Google Ads</Td>
                    <Td>
                      <code>_gcl_*</code>, <code>_gcl_au</code>
                    </Td>
                    <Td>Misurazione delle conversioni pubblicitarie</Td>
                    <Td>Fino a 90 giorni</Td>
                  </tr>
                )}
                {services.metaPixelId && (
                  <tr>
                    <Td>Meta Pixel</Td>
                    <Td>
                      <code>_fbp</code>, <code>_fbc</code>
                    </Td>
                    <Td>Misurazione conversioni e campagne Meta</Td>
                    <Td>Fino a 3 mesi</Td>
                  </tr>
                )}
                {services.bingUetTagId && (
                  <tr>
                    <Td>Microsoft Advertising / Bing UET</Td>
                    <Td>
                      <code>_uetsid</code>, <code>_uetvid</code>,{" "}
                      <code>_uetmsclkid</code>
                    </Td>
                    <Td>Misurazione conversioni e campagne Microsoft Advertising</Td>
                    <Td>Fino a 13 mesi</Td>
                  </tr>
                )}
              </LegalTable>
            ) : (
              <p className={paragraphClass}>
                Al momento non sono configurati cookie analitici o marketing. Se verranno
                attivati in futuro strumenti come Google Analytics 4, Google Ads, Meta
                Pixel o servizi Bing/Microsoft Advertising, compariranno nel pannello
                preferenze e resteranno bloccati finché non avrai espresso consenso.
              </p>
            )}
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Fornitori collegati</p>
            <h2 className={headingClass}>{servicesSectionNumber}. Servizi terzi collegati</h2>
            <p className={paragraphClass}>
              Alcuni servizi possono impostare cookie o usare strumenti simili quando
              interagisci con funzioni specifiche del sito. La manutenzione tecnica
              dell&apos;applicazione è curata da{" "}
              <strong>{PUBLIC_TECHNICAL_MAINTAINER.name}</strong>, P.IVA{" "}
              {PUBLIC_TECHNICAL_MAINTAINER.vatNumber}, con sede legale in{" "}
              {PUBLIC_TECHNICAL_MAINTAINER.legalAddress}, per conto di Egadisailing quale
              responsabile del trattamento ai sensi dell&apos;art. 28 GDPR.
            </p>
            <LegalTable headers={["Fornitore", "Quando viene usato", "Policy"]}>
              <tr>
                <Td>{PUBLIC_TECHNICAL_MAINTAINER.name}</Td>
                <Td>Sviluppo, manutenzione tecnica, database, deploy e supporto applicativo</Td>
                <Td>Responsabile del trattamento nominato da Egadisailing</Td>
              </tr>
              <tr>
                <Td>OVH Cloud</Td>
                <Td>VPS, database e backup sul VPS OVH</Td>
                <Td>Infrastruttura tecnica</Td>
              </tr>
              <tr>
                <Td>Cloudflare DNS / sicurezza</Td>
                <Td>DNS, sicurezza, eventuale proxy/CDN e servizi anti-abuso</Td>
                <Td>
                  <a
                    className="font-semibold text-[#0b6694]"
                    href="https://www.cloudflare.com/privacypolicy/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    cloudflare.com/privacypolicy
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>IONOS</Td>
                <Td>Dominio e servizi tecnici collegati al dominio</Td>
                <Td>Fornitore dominio</Td>
              </tr>
              <tr>
                <Td>GitHub</Td>
                <Td>Codice sorgente, versionamento e processi tecnici di deploy</Td>
                <Td>
                  <a
                    className="font-semibold text-[#0b6694]"
                    href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    GitHub Privacy Statement
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Stripe</Td>
                <Td>Durante pagamento, checkout, ricevute e prevenzione frodi</Td>
                <Td>
                  <a className="font-semibold text-[#0b6694]" href="https://stripe.com/privacy" rel="noopener noreferrer" target="_blank">
                    stripe.com/privacy
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Cloudflare Turnstile</Td>
                <Td>Nei moduli protetti e nel checkout per distinguere utenti reali da bot</Td>
                <Td>
                  <a
                    className="font-semibold text-[#0b6694]"
                    href="https://www.cloudflare.com/privacypolicy/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    cloudflare.com/privacypolicy
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Brevo</Td>
                <Td>Email operative e transazionali inviate da Egadisailing</Td>
                <Td>
                  <a
                    className="font-semibold text-[#0b6694]"
                    href="https://www.brevo.com/legal/privacypolicy/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    brevo.com/legal/privacypolicy
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Telegram</Td>
                <Td>Notifiche operative all&apos;amministrazione, se configurato</Td>
                <Td>
                  <a
                    className="font-semibold text-[#0b6694]"
                    href="https://telegram.org/privacy"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    telegram.org/privacy
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Sentry</Td>
                <Td>
                  Monitoraggio errori solo se verrà abilitato. Non risulta attivo
                  nell&apos;ambiente applicativo attuale.
                </Td>
                <Td>
                  <a
                    className="font-semibold text-[#0b6694]"
                    href="https://sentry.io/privacy/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    sentry.io/privacy
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Bokun, Boataround e altri canali OTA/charter</Td>
                <Td>
                  Sincronizzazione disponibilità e prenotazioni quando i canali vengono
                  attivati
                </Td>
                <Td>Policy dei rispettivi canali esterni</Td>
              </tr>
              <tr>
                <Td>Open-Meteo</Td>
                <Td>Dati meteo tecnici, se configurato</Td>
                <Td>
                  <a
                    className="font-semibold text-[#0b6694]"
                    href="https://open-meteo.com/en/terms"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    open-meteo.com/en/terms
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Google, Meta e Microsoft Advertising</Td>
                <Td>
                  Verifiche dominio e, solo dopo consenso, misurazione campagne,
                  conversioni e remarketing se configurati
                </Td>
                <Td>
                  <a className="font-semibold text-[#0b6694]" href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">
                    Google Privacy
                  </a>
                  {" · "}
                  <a className="font-semibold text-[#0b6694]" href="https://www.facebook.com/privacy/policy/" rel="noopener noreferrer" target="_blank">
                    Meta Privacy
                  </a>
                  {" · "}
                  <a className="font-semibold text-[#0b6694]" href="https://privacy.microsoft.com/privacystatement" rel="noopener noreferrer" target="_blank">
                    Microsoft Privacy
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Google Maps</Td>
                <Td>Quando viene caricata la mappa nella pagina contatti</Td>
                <Td>
                  <a className="font-semibold text-[#0b6694]" href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">
                    policies.google.com/privacy
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>WhatsApp, Instagram, Facebook</Td>
                <Td>Solo se clicchi sui link social o di contatto esterni</Td>
                <Td>
                  <a className="font-semibold text-[#0b6694]" href="https://www.facebook.com/privacy/policy/" rel="noopener noreferrer" target="_blank">
                    facebook.com/privacy/policy
                  </a>
                </Td>
              </tr>
            </LegalTable>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Preferenze</p>
            <h2 className={headingClass}>{consentSectionNumber}. Gestione del consenso</h2>
            <p className={paragraphClass}>
              Puoi modificare o revocare il consenso in qualsiasi momento dal pulsante
              &quot;Preferenze cookie&quot; nel footer o dal pulsante flottante in basso a
              sinistra. La scelta viene registrata con identificativo consenso, versione
              della policy, categorie accettate o rifiutate, servizi accettati o rifiutati,
              hash della configurazione mostrata, data, user-agent e hash dell&apos;indirizzo
              IP per finalità di prova e accountability.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Browser</p>
            <h2 className={headingClass}>{browserSectionNumber}. Impostazioni del browser</h2>
            <p className={paragraphClass}>
              Puoi cancellare o bloccare cookie, local storage e session storage anche
              dalle impostazioni del browser. Il blocco dei cookie tecnici può impedire il
              corretto funzionamento di lingua, login, recupero prenotazione, checkout e
              preferenze privacy.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Contatti</p>
            <h2 className={headingClass}>{contactsSectionNumber}. Contatti</h2>
            <p className={paragraphClass}>
              Per domande sulla Cookie Policy di {PUBLIC_COMPANY_LEGAL.name}:{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PRIVACY_CONTACT_EMAIL)}>
                {PUBLIC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
