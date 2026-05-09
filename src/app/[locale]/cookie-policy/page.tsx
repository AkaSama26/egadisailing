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
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return buildPageMetadata({
    title: isEs ? "Política de cookies" : isFr ? "Politique de cookies" : isDe ? "Cookie-Richtlinie" : isEn ? "Cookie Policy" : "Cookie Policy",
    description: isEs
      ? "Política de cookies Egadisailing: cookies técnicos, consentimiento, sesiones, pagos Stripe, Cloudflare, Google Maps y rastreadores opcionales solo tras consentimiento."
      : isFr
      ? "Politique de cookies Egadisailing : cookies techniques, consentement, sessions, paiements Stripe, Cloudflare, Google Maps et traceurs optionnels uniquement après consentement."
      : isDe
      ? "Egadisailing Cookie-Richtlinie: technische Cookies, Einwilligung, Sitzungen, Stripe-Zahlungen, Cloudflare, Google Maps und optionale Tracker nur nach Zustimmung."
      : isEn
      ? "Egadisailing Cookie Policy: technical cookies, consent choices, booking sessions, Stripe payments, Cloudflare, Google Maps and optional trackers."
      : "Cookie Policy Egadisailing: cookie tecnici, consenso, sessioni, pagamenti Stripe, Cloudflare, Google Maps e tracker opzionali solo dopo consenso.",
    path: "/cookie-policy",
    locale,
  });
}

function GermanCookiePolicyPage() {
  const services = getCookieConsentPublicServices();
  const hasOptionalServices = hasOptionalCookieConsentServices(services);
  const siteVerification = getSiteVerificationConfig();
  const hasVerificationTags = Boolean(
    siteVerification.googleSiteVerification ||
      siteVerification.bingSiteVerification ||
      siteVerification.metaDomainVerification,
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071934_0%,#0b3154_22rem,#f8fafc_22rem,#ffffff_100%)] px-4 pb-20 pt-32 sm:px-6">
      <article className="mx-auto max-w-5xl">
        <header className="pb-10 text-white">
          <p className={eyebrowClass}>Präferenzen und technische Werkzeuge</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Cookie-Richtlinie Egadisailing
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
            Technische Cookies, Sitzungen, Einwilligung, Local Storage, Zahlungen,
            Anti-Bot-Schutz, Karten, externe Dienste und optionale Werkzeuge, die nur nach Einwilligung geladen werden.
          </p>
          <p className="mt-4 text-sm text-white/55">
            Gültig ab {COOKIE_CONSENT_EFFECTIVE_DATE}
          </p>
        </header>

        <div className="space-y-6">
          <section className={sectionClass}>
            <p className={eyebrowClass}>Einführung</p>
            <h2 className={headingClass}>1. Cookies und ähnliche Werkzeuge</h2>
            <p className={paragraphClass}>
              Cookies sind kleine Dateien, die der Browser speichert. Einige sind für den Betrieb
              der Website notwendig; andere können Besuche oder Kampagnen messen. Die Anwendung
              kann außerdem Local Storage und Session Storage für temporäre Präferenzen oder
              technische Kennungen verwenden.
            </p>
            <p className={paragraphClass}>
              Egadisailing nutzt notwendige technische Cookies für Navigation, Sprache, Sicherheit,
              Sitzungen, Buchungsabruf, Zahlungen und Anti-Bot-Schutz. Analyse-, Marketing- oder
              Kampagnenmesswerkzeuge werden nur geladen, wenn eine Einwilligung erforderlich ist und
              erteilt wurde.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Immer aktiv</p>
            <h2 className={headingClass}>2. Technische und notwendige Cookies</h2>
            <LegalTable headers={["Name", "Anbieter", "Zweck", "Dauer"]}>
              <tr><Td><code>{COOKIE_CONSENT_COOKIE_NAME}</code></Td><Td>Egadisailing</Td><Td>Speichert die vom Nutzer geäußerten Cookie-Präferenzen</Td><Td>6 Monate</Td></tr>
              <tr><Td><code>NEXT_LOCALE</code></Td><Td>Egadisailing</Td><Td>Speichert die ausgewählte Sprache</Td><Td>1 Jahr</Td></tr>
              <tr><Td><code>egadi-booking-session</code></Td><Td>Egadisailing</Td><Td>Sitzung des Kundenbereichs zum Abruf der Buchung</Td><Td>7 Tage</Td></tr>
              <tr><Td><code>authjs.session-token</code></Td><Td>Auth.js / Egadisailing</Td><Td>Sichere Sitzung des Adminbereichs</Td><Td>Bis zu 8 Stunden</Td></tr>
              <tr><Td><code>__stripe_mid</code>, <code>__stripe_sid</code>, <code>m</code></Td><Td>Stripe</Td><Td>Zahlungen, Betrugsprävention und Checkout-Sicherheit</Td><Td>Variabel nach Stripe-Richtlinie</Td></tr>
              <tr><Td>Variable Cloudflare-Namen</Td><Td>Cloudflare Turnstile</Td><Td>Anti-Bot-Prüfung in Formularen und Checkout</Td><Td>Variabel nach Cloudflare-Richtlinie</Td></tr>
              <tr><Td>Keine Browser-Cookies</Td><Td>Cloudflare Analytics Edge</Td><Td>Aggregierte serverseitige Statistiken zu Traffic, Performance, Statuscodes und Cache für das Admin-Dashboard</Td><Td>Keine Speicherung im Browser</Td></tr>
              <tr><Td>Variable Google-Maps-Namen</Td><Td>Google</Td><Td>Laden der eingebetteten Karte auf der Kontaktseite</Td><Td>Variabel nach Google-Richtlinie</Td></tr>
            </LegalTable>
          </section>

          {hasVerificationTags && (
            <section className={sectionClass}>
              <p className={eyebrowClass}>Domain-Verifizierung</p>
              <h2 className={headingClass}>3. Meta-Tags zur Eigentumsverifizierung</h2>
              <p className={paragraphClass}>
                Die Website kann technische Meta-Tags enthalten, um die Domain-Eigentümerschaft in
                Google Search Console, Bing Webmaster Tools und Meta Business zu verifizieren.
                Diese Tags stehen im HTML, setzen keine Cookies und aktivieren kein Werbetracking.
              </p>
            </section>
          )}

          <section className={sectionClass}>
            <p className={eyebrowClass}>Optional</p>
            <h2 className={headingClass}>Analyse- und Marketing-Werkzeuge</h2>
            <p className={paragraphClass}>
              {hasOptionalServices
                ? "Konfigurierte optionale Werkzeuge werden nur nach Ihrer Einwilligung geladen. Sie können Ihre Wahl im Cookie-Präferenzbereich ändern."
                : "Derzeit sind keine optionalen Werkzeuge aktiv. Wenn sie künftig hinzugefügt werden, werden sie nur nach Ihrer Einwilligung geladen, sofern erforderlich."}
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Ihre Wahl</p>
            <h2 className={headingClass}>Präferenzen und Kontakt</h2>
            <p className={paragraphClass}>
              Sie können Ihre Einwilligung über die Cookie-Präferenzen ändern oder widerrufen,
              wenn Banner oder Link verfügbar sind. Cookies können außerdem im Browser verwaltet
              werden. Für Datenschutzanfragen schreiben Sie an{" "}
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

function FrenchCookiePolicyPage() {
  const services = getCookieConsentPublicServices();
  const hasOptionalServices = hasOptionalCookieConsentServices(services);
  const siteVerification = getSiteVerificationConfig();
  const hasVerificationTags = Boolean(
    siteVerification.googleSiteVerification ||
      siteVerification.bingSiteVerification ||
      siteVerification.metaDomainVerification,
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071934_0%,#0b3154_22rem,#f8fafc_22rem,#ffffff_100%)] px-4 pb-20 pt-32 sm:px-6">
      <article className="mx-auto max-w-5xl">
        <header className="pb-10 text-white">
          <p className={eyebrowClass}>Préférences et outils techniques</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Politique de cookies Egadisailing
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
            Cookies techniques, sessions, consentement, local storage, paiements,
            anti-bot, cartes, services externes et outils optionnels chargés uniquement après consentement.
          </p>
          <p className="mt-4 text-sm text-white/55">
            En vigueur depuis le {COOKIE_CONSENT_EFFECTIVE_DATE}
          </p>
        </header>

        <div className="space-y-6">
          <section className={sectionClass}>
            <p className={eyebrowClass}>Introduction</p>
            <h2 className={headingClass}>1. Cookies et outils similaires</h2>
            <p className={paragraphClass}>
              Les cookies sont de petits fichiers enregistrés par le navigateur. Certains sont
              nécessaires au fonctionnement du site ; d'autres peuvent mesurer visites ou campagnes.
              L'application peut aussi utiliser local storage et session storage pour préférences
              temporaires ou identifiants techniques.
            </p>
            <p className={paragraphClass}>
              Egadisailing utilise des cookies techniques nécessaires à navigation, langue,
              sécurité, sessions, récupération de réservation, paiements et protection anti-bot.
              Les outils analytiques, marketing ou mesure de campagnes sont chargés seulement
              après votre consentement lorsque nécessaire.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Toujours actifs</p>
            <h2 className={headingClass}>2. Cookies techniques et nécessaires</h2>
            <LegalTable headers={["Nom", "Fournisseur", "Finalité", "Durée"]}>
              <tr><Td><code>{COOKIE_CONSENT_COOKIE_NAME}</code></Td><Td>Egadisailing</Td><Td>Enregistre les préférences cookies exprimées par l'utilisateur</Td><Td>6 mois</Td></tr>
              <tr><Td><code>NEXT_LOCALE</code></Td><Td>Egadisailing</Td><Td>Enregistre la langue sélectionnée</Td><Td>1 an</Td></tr>
              <tr><Td><code>egadi-booking-session</code></Td><Td>Egadisailing</Td><Td>Session de l'espace client pour consulter la réservation</Td><Td>7 jours</Td></tr>
              <tr><Td><code>authjs.session-token</code></Td><Td>Auth.js / Egadisailing</Td><Td>Session sécurisée de l'espace administrateur</Td><Td>Jusqu'à 8 heures</Td></tr>
              <tr><Td><code>__stripe_mid</code>, <code>__stripe_sid</code>, <code>m</code></Td><Td>Stripe</Td><Td>Paiements, prévention fraude et sécurité checkout</Td><Td>Variable selon politique Stripe</Td></tr>
              <tr><Td>Noms variables Cloudflare</Td><Td>Cloudflare Turnstile</Td><Td>Vérification anti-bot dans formulaires et checkout</Td><Td>Variable selon politique Cloudflare</Td></tr>
              <tr><Td>Aucun cookie navigateur</Td><Td>Cloudflare Analytics Edge</Td><Td>Statistiques agrégées côté serveur sur trafic, performance, codes HTTP et cache pour le tableau de bord admin</Td><Td>Aucun stockage dans le navigateur</Td></tr>
              <tr><Td>Noms variables Google Maps</Td><Td>Google</Td><Td>Chargement de la carte intégrée dans la page contact</Td><Td>Variable selon politique Google</Td></tr>
            </LegalTable>
          </section>

          {hasVerificationTags && (
            <section className={sectionClass}>
              <p className={eyebrowClass}>Vérification de domaine</p>
              <h2 className={headingClass}>3. Meta tags de vérification de propriété</h2>
              <p className={paragraphClass}>
                Le site peut inclure des meta tags techniques pour vérifier la propriété du
                domaine dans Google Search Console, Bing Webmaster Tools et Meta Business.
                Ces tags sont dans le HTML, n'installent pas de cookies et n'activent pas de suivi publicitaire.
              </p>
            </section>
          )}

          <section className={sectionClass}>
            <p className={eyebrowClass}>Optionnels</p>
            <h2 className={headingClass}>Outils analytiques et marketing</h2>
            <p className={paragraphClass}>
              {hasOptionalServices
                ? "Les outils optionnels configurés sont chargés uniquement après votre consentement. Vous pouvez changer d'avis depuis le panneau de préférences cookies."
                : "Aucun outil optionnel n'est actuellement actif. S'ils sont ajoutés à l'avenir, ils seront chargés seulement après votre consentement lorsque nécessaire."}
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Vos choix</p>
            <h2 className={headingClass}>Préférences et contact</h2>
            <p className={paragraphClass}>
              Vous pouvez modifier ou retirer le consentement depuis les préférences cookies
              lorsque le bandeau ou le lien sont disponibles. Vous pouvez aussi gérer les cookies
              depuis votre navigateur. Pour demandes privacy, écrivez à{" "}
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

function SpanishCookiePolicyPage() {
  const services = getCookieConsentPublicServices();
  const hasOptionalServices = hasOptionalCookieConsentServices(services);
  const siteVerification = getSiteVerificationConfig();
  const hasVerificationTags = Boolean(
    siteVerification.googleSiteVerification ||
      siteVerification.bingSiteVerification ||
      siteVerification.metaDomainVerification,
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071934_0%,#0b3154_22rem,#f8fafc_22rem,#ffffff_100%)] px-4 pb-20 pt-32 sm:px-6">
      <article className="mx-auto max-w-5xl">
        <header className="pb-10 text-white">
          <p className={eyebrowClass}>Preferencias y herramientas técnicas</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Política de cookies Egadisailing
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
	            Cookies técnicas, sesiones, consentimiento, local storage, pagos, anti-bot,
            mapas, servicios externos y herramientas opcionales cargadas solo tras consentimiento.
          </p>
          <p className="mt-4 text-sm text-white/55">
            En vigor desde el {COOKIE_CONSENT_EFFECTIVE_DATE}
          </p>
        </header>

        <div className="space-y-6">
          <section className={sectionClass}>
            <p className={eyebrowClass}>Introducción</p>
            <h2 className={headingClass}>1. Qué son las cookies y herramientas similares</h2>
            <p className={paragraphClass}>
              Las cookies son pequeños archivos guardados por el navegador. Algunas son
              necesarias para que el sitio funcione; otras pueden medir visitas o campañas
              publicitarias. La aplicación también puede usar local storage y session storage
              para guardar preferencias temporales o identificadores técnicos.
            </p>
            <p className={paragraphClass}>
	              Egadisailing usa cookies técnicas necesarias para navegación, idioma, seguridad,
              sesiones, recuperación de reserva, pagos y protección anti-bot. Herramientas
              analíticas, marketing o medición de campañas se cargan solo tras tu consentimiento.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Siempre activos</p>
	            <h2 className={headingClass}>2. Cookies técnicas y necesarias</h2>
            <LegalTable headers={["Nombre", "Proveedor", "Finalidad", "Duración"]}>
              <tr><Td><code>{COOKIE_CONSENT_COOKIE_NAME}</code></Td><Td>Egadisailing</Td><Td>Guarda las preferencias de cookies expresadas por el usuario</Td><Td>6 meses</Td></tr>
              <tr><Td><code>NEXT_LOCALE</code></Td><Td>Egadisailing</Td><Td>Guarda el idioma seleccionado</Td><Td>1 año</Td></tr>
              <tr><Td><code>egadi-booking-session</code></Td><Td>Egadisailing</Td><Td>Sesión del área cliente para consultar la reserva</Td><Td>7 días</Td></tr>
              <tr><Td><code>authjs.session-token</code></Td><Td>Auth.js / Egadisailing</Td><Td>Sesión segura del área administrativa</Td><Td>Hasta 8 horas</Td></tr>
              <tr><Td><code>__stripe_mid</code>, <code>__stripe_sid</code>, <code>m</code></Td><Td>Stripe</Td><Td>Pagos, prevención de fraude y seguridad del checkout</Td><Td>Variable según política Stripe</Td></tr>
              <tr><Td>Nombres variables Cloudflare</Td><Td>Cloudflare Turnstile</Td><Td>Verificación anti-bot en formularios y checkout</Td><Td>Variable según política Cloudflare</Td></tr>
              <tr><Td>Sin cookies del navegador</Td><Td>Cloudflare Analytics Edge</Td><Td>Estadísticas agregadas del lado servidor sobre tráfico, rendimiento, códigos HTTP y caché para el panel admin</Td><Td>Sin almacenamiento en el navegador</Td></tr>
              <tr><Td>Nombres variables Google Maps</Td><Td>Google</Td><Td>Carga del mapa incorporado en la página de contacto</Td><Td>Variable según política Google</Td></tr>
            </LegalTable>
          </section>

          {hasVerificationTags && (
            <section className={sectionClass}>
              <p className={eyebrowClass}>Verificación de dominio</p>
              <h2 className={headingClass}>3. Meta tags de verificación de propiedad</h2>
              <p className={paragraphClass}>
                El sitio puede incluir meta tags técnicos para verificar la propiedad del
                dominio en Google Search Console, Bing Webmaster Tools y Meta Business. Estos
                tags están en el HTML, no instalan cookies y no activan seguimiento publicitario.
              </p>
            </section>
          )}

          <section className={sectionClass}>
            <p className={eyebrowClass}>Browser storage</p>
            <h2 className={headingClass}>Local storage y session storage</h2>
            <p className={paragraphClass}>
              El sitio puede usar almacenamiento local para recordar preferencias no sensibles,
              borradores temporales del checkout o estados de interfaz. Algunos datos se borran
              al cerrar la sesión o al terminar la navegación.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Opcionales</p>
            <h2 className={headingClass}>Herramientas analíticas y marketing</h2>
            <p className={paragraphClass}>
              {hasOptionalServices
                ? "Las herramientas opcionales configuradas se cargan solo después de tu consentimiento. Puedes cambiar de idea desde el panel de preferencias cookie."
                : "Actualmente no hay herramientas opcionales activas. Si se añaden en el futuro, se cargarán solo después de tu consentimiento cuando sea necesario."}
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Tus opciones</p>
            <h2 className={headingClass}>Preferencias y contacto</h2>
            <p className={paragraphClass}>
              Puedes modificar o retirar el consentimiento desde las preferencias de cookies
              cuando el banner o el enlace estén disponibles. También puedes gestionar cookies
              desde la configuración del navegador. Para solicitudes de privacidad escribe a{" "}
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

export default async function CookiePolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale === "es") return <SpanishCookiePolicyPage />;
  if (locale === "fr") return <FrenchCookiePolicyPage />;
  if (locale === "de") return <GermanCookiePolicyPage />;

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
                <Td>Nessun cookie browser</Td>
                <Td>Cloudflare Analytics Edge</Td>
                <Td>
                  Statistiche aggregate lato server su traffico, performance, codici HTTP e
                  cache per il pannello admin
                </Td>
                <Td>Nessuna memorizzazione nel browser</Td>
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
                <Td>
                  DNS, sicurezza, eventuale proxy/CDN, servizi anti-abuso e statistiche
                  aggregate edge per il widget traffico admin, senza nuovi cookie browser
                </Td>
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
