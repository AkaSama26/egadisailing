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
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return buildPageMetadata({
    title: isEs ? "Política de privacidad" : isFr ? "Politique de confidentialité" : isDe ? "Datenschutzerklärung" : isEn ? "Privacy Policy" : "Informativa privacy",
    description: isEs
      ? "Política de privacidad de Egadisailing para reservas, pagos, solicitudes de contacto, cookies, seguridad y servicios de terceros utilizados por la plataforma."
      : isFr
      ? "Politique de confidentialité Egadisailing pour réservations, paiements, demandes de contact, cookies, sécurité et services tiers utilisés par la plateforme."
      : isDe
      ? "Datenschutzerklärung von Egadisailing für Buchungen, Zahlungen, Kontaktanfragen, Cookies, Sicherheit und Drittanbieter-Dienste der Plattform."
      : isEn
      ? "Egadisailing Privacy Policy for bookings, payments, contact requests, cookies, security and third-party services used by the platform."
      : "Informativa privacy di Egadisailing su prenotazioni, pagamenti, contatti, cookie, sicurezza e servizi terzi utilizzati dall'app.",
    path: "/privacy",
    locale,
  });
}

function GermanPrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071934_0%,#0b3154_22rem,#f8fafc_22rem,#ffffff_100%)] px-4 pb-20 pt-32 sm:px-6">
      <article className="mx-auto max-w-5xl">
        <header className="pb-10 text-white">
          <p className={eyebrowClass}>Datenschutzerklärung</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Datenschutzerklärung Egadisailing
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
            Wie wir personenbezogene Daten verarbeiten, die über Website, Buchungen,
            Zahlungen, Kontakte, Buchungsabruf, Sicherheit und technische Wartung erhoben werden.
          </p>
          <p className="mt-4 text-sm text-white/55">
            Version {CURRENT_POLICY_VERSION} · Gültig ab {EFFECTIVE_DATE}
          </p>
        </header>

        <div className="space-y-6">
          <section className={sectionClass}>
            <p className={eyebrowClass}>Verantwortlicher</p>
            <h2 className={headingClass}>1. Verantwortlicher der Verarbeitung</h2>
            <p className={paragraphClass}>
              Verantwortlicher ist <strong>{PUBLIC_COMPANY_LEGAL.name}</strong>, Sitz{" "}
              {PUBLIC_COMPANY_LEGAL.legalAddress}, USt-IdNr. {PUBLIC_COMPANY_LEGAL.vatNumber},
              PEC{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PUBLIC_COMPANY_LEGAL.pec)}>
                {PUBLIC_COMPANY_LEGAL.pec}
              </a>
              . Für Informationen, Datenschutzanfragen und Hilfe schreiben Sie an{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PRIVACY_CONTACT_EMAIL)}>
                {PUBLIC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Technische Wartung</p>
            <h2 className={headingClass}>2. Technischer Dienstleister der Anwendung</h2>
            <p className={paragraphClass}>
              Code, Datenbank, Deployments, technische Wartung und Support der Plattform werden von{" "}
              <strong>{PUBLIC_TECHNICAL_MAINTAINER.name}</strong> verwaltet. Der Dienstleister handelt
              im Auftrag von Egadisailing als Auftragsverarbeiter, wenn er für Wartung, Sicherheit,
              Backups oder Support auf personenbezogene Daten zugreift.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Datenkategorien</p>
            <h2 className={headingClass}>3. Verarbeitete personenbezogene Daten</h2>
            <ul className={listClass}>
              <li><strong>Buchungen:</strong> Name, E-Mail, Telefon, Erlebnis, Boot, Datum, Teilnehmer, Beträge, Status, Buchungscode und Einwilligungen.</li>
              <li><strong>Zahlungen:</strong> Betrag, Währung, Zahlungsstatus und technische Stripe-Referenzen. Vollständige Kartendaten werden nicht auf Egadisailing-Servern gespeichert.</li>
              <li><strong>Kontakte:</strong> Name, E-Mail, Telefon falls angegeben, Betreff und Nachricht.</li>
              <li><strong>Buchungsabruf:</strong> E-Mail, gehashter OTP-Code, temporäre Sitzung, IP und User-Agent aus Sicherheitsgründen.</li>
              <li><strong>Cookies und Sicherheit:</strong> Einwilligungspräferenzen, Sprache, technische Logs, Rate-Limit, Sitzungstokens und minimale Anti-Missbrauchsdaten.</li>
            </ul>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Zwecke</p>
            <h2 className={headingClass}>4. Zwecke und Rechtsgrundlagen</h2>
            <LegalTable headers={["Zweck", "Rechtsgrundlage"]}>
              <tr><Td>Anfragen, Angebote und vorvertragliche Kommunikation verwalten</Td><Td>Vorvertragliche Maßnahmen - Art. 6 Abs. 1 lit. b DSGVO</Td></tr>
              <tr><Td>Buchungen, Zahlungen, Restbeträge und Kundenhilfe erstellen und verwalten</Td><Td>Vertragserfüllung - Art. 6 Abs. 1 lit. b DSGVO</Td></tr>
              <tr><Td>Steuerliche, buchhalterische und administrative Pflichten erfüllen</Td><Td>Gesetzliche Pflicht - Art. 6 Abs. 1 lit. c DSGVO</Td></tr>
              <tr><Td>Sicherheit, Betrugsprävention, Anti-Spam und technische Audits</Td><Td>Berechtigtes Interesse - Art. 6 Abs. 1 lit. f DSGVO</Td></tr>
              <tr><Td>Analytische oder Marketing-Cookies, sofern konfiguriert und akzeptiert</Td><Td>Einwilligung - Art. 6 Abs. 1 lit. a DSGVO und ePrivacy</Td></tr>
            </LegalTable>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Empfänger</p>
            <h2 className={headingClass}>5. Dienstleister und externe Dienste</h2>
            <p className={paragraphClass}>
              Daten können an für den Service notwendige Anbieter übermittelt werden: Stripe für
              Zahlungen, Anbieter transaktionaler E-Mails, Cloudflare für DNS/CDN, Sicherheit,
              Performance und aggregierte Edge-Statistiken im Adminbereich, Cloudflare Turnstile,
              Hosting/Datenbank, Google Maps, Sicherheitswerkzeuge und verbundene
              Buchungsplattformen. Einige Anbieter können außerhalb des EWR tätig sein; es gelten
              geeignete Garantien wie DPF, SCC oder andere gesetzlich vorgesehene Mechanismen.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Aufbewahrung und Rechte</p>
            <h2 className={headingClass}>6. Aufbewahrung und Betroffenenrechte</h2>
            <p className={paragraphClass}>
              Daten werden so lange gespeichert, wie es für vertragliche, steuerliche,
              buchhalterische, Sicherheits- und Supportzwecke erforderlich ist. Sie können Auskunft,
              Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit, soweit
              anwendbar, und den Widerruf von Einwilligungen verlangen, indem Sie an{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PRIVACY_CONTACT_EMAIL)}>
                {PUBLIC_CONTACT_EMAIL}
              </a>{" "}
              schreiben.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}

function FrenchPrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071934_0%,#0b3154_22rem,#f8fafc_22rem,#ffffff_100%)] px-4 pb-20 pt-32 sm:px-6">
      <article className="mx-auto max-w-5xl">
        <header className="pb-10 text-white">
          <p className={eyebrowClass}>Politique de confidentialité</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Politique de confidentialité Egadisailing
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
            Comment nous traitons les données personnelles collectées via site, réservations,
            paiements, contacts, récupération de réservation, sécurité et maintenance technique.
          </p>
          <p className="mt-4 text-sm text-white/55">
            Version {CURRENT_POLICY_VERSION} · En vigueur depuis le {EFFECTIVE_DATE}
          </p>
        </header>

        <div className="space-y-6">
          <section className={sectionClass}>
            <p className={eyebrowClass}>Responsable</p>
            <h2 className={headingClass}>1. Responsable du traitement</h2>
            <p className={paragraphClass}>
              Le responsable du traitement est <strong>{PUBLIC_COMPANY_LEGAL.name}</strong>,
              siège social {PUBLIC_COMPANY_LEGAL.legalAddress}, TVA {PUBLIC_COMPANY_LEGAL.vatNumber},
              PEC{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PUBLIC_COMPANY_LEGAL.pec)}>
                {PUBLIC_COMPANY_LEGAL.pec}
              </a>
              . Pour informations, demandes privacy et assistance, écrivez à{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PRIVACY_CONTACT_EMAIL)}>
                {PUBLIC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Maintenance technique</p>
            <h2 className={headingClass}>2. Prestataire technique de l'application</h2>
            <p className={paragraphClass}>
              Code, base de données, déploiements, maintenance et support technique sont gérés par{" "}
              <strong>{PUBLIC_TECHNICAL_MAINTAINER.name}</strong>, qui agit pour le compte
              d'Egadisailing comme sous-traitant lorsqu'il accède à des données personnelles pour
              maintenance, sécurité, sauvegarde ou assistance.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Données</p>
            <h2 className={headingClass}>3. Données personnelles traitées</h2>
            <ul className={listClass}>
              <li><strong>Réservations :</strong> nom, email, téléphone, expérience, bateau, date, participants, montants, statut, code de réservation et consentements.</li>
              <li><strong>Paiements :</strong> montant, devise, statut du paiement et références techniques Stripe. Les données complètes de carte ne sont pas conservées sur les serveurs Egadisailing.</li>
              <li><strong>Contacts :</strong> nom, email, téléphone si indiqué, sujet et message.</li>
              <li><strong>Récupération de réservation :</strong> email, OTP hashé, session temporaire, IP et user-agent pour sécurité.</li>
              <li><strong>Cookies et sécurité :</strong> préférences de consentement, langue, logs techniques, rate limit, tokens de session et données minimales anti-abus.</li>
            </ul>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Finalités</p>
            <h2 className={headingClass}>4. Finalités et bases juridiques</h2>
            <LegalTable headers={["Finalité", "Base juridique"]}>
              <tr><Td>Gérer demandes, devis et communications précontractuelles</Td><Td>Mesures précontractuelles - art. 6.1.b RGPD</Td></tr>
              <tr><Td>Créer et gérer réservations, paiements, solde et assistance client</Td><Td>Exécution du contrat - art. 6.1.b RGPD</Td></tr>
              <tr><Td>Respecter obligations fiscales, comptables et administratives</Td><Td>Obligation légale - art. 6.1.c RGPD</Td></tr>
              <tr><Td>Sécurité, prévention fraude, anti-spam et audit technique</Td><Td>Intérêt légitime - art. 6.1.f RGPD</Td></tr>
              <tr><Td>Cookies analytiques ou marketing, si configurés et acceptés</Td><Td>Consentement - art. 6.1.a RGPD et ePrivacy</Td></tr>
            </LegalTable>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Destinataires</p>
            <h2 className={headingClass}>5. Fournisseurs et services externes</h2>
            <p className={paragraphClass}>
              Les données peuvent être communiquées aux fournisseurs nécessaires au service :
              Stripe pour paiements, fournisseurs d'email transactionnel, Cloudflare pour DNS/CDN,
              sécurité, performance et statistiques edge agrégées dans l'administration,
              Cloudflare Turnstile, hébergement/base de données, Google Maps, outils de sécurité
              et plateformes de réservation connectées. Certains fournisseurs peuvent opérer hors
              EEE avec garanties applicables comme DPF, SCC ou mécanismes prévus par la
              réglementation.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Conservation et droits</p>
            <h2 className={headingClass}>6. Conservation et droits des personnes</h2>
            <p className={paragraphClass}>
              Les données sont conservées pendant les délais nécessaires aux obligations
              contractuelles, fiscales, comptables, sécurité et assistance. Vous pouvez demander
              accès, rectification, effacement, limitation, opposition, portabilité lorsque
              applicable et retirer vos consentements en écrivant à{" "}
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

function SpanishPrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071934_0%,#0b3154_22rem,#f8fafc_22rem,#ffffff_100%)] px-4 pb-20 pt-32 sm:px-6">
      <article className="mx-auto max-w-5xl">
        <header className="pb-10 text-white">
          <p className={eyebrowClass}>Política de privacidad</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Política de privacidad Egadisailing
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
            Cómo tratamos los datos personales recogidos a través del sitio, reservas,
            pagos, contactos, recuperación de reserva, seguridad y mantenimiento técnico.
          </p>
          <p className="mt-4 text-sm text-white/55">
            Versión {CURRENT_POLICY_VERSION} · En vigor desde el {EFFECTIVE_DATE}
          </p>
        </header>

        <div className="space-y-6">
          <section className={sectionClass}>
            <p className={eyebrowClass}>Responsable</p>
            <h2 className={headingClass}>1. Responsable del tratamiento</h2>
            <p className={paragraphClass}>
              El responsable del tratamiento es <strong>{PUBLIC_COMPANY_LEGAL.name}</strong>,
              con domicilio social en {PUBLIC_COMPANY_LEGAL.legalAddress}, NIF/IVA{" "}
              {PUBLIC_COMPANY_LEGAL.vatNumber}, PEC{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PUBLIC_COMPANY_LEGAL.pec)}>
                {PUBLIC_COMPANY_LEGAL.pec}
              </a>
              . Para información, solicitudes de privacidad y asistencia puedes escribir a{" "}
              <a className="font-semibold text-[#0b6694]" href={getEmailHref(PRIVACY_CONTACT_EMAIL)}>
                {PUBLIC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Mantenimiento técnico</p>
            <h2 className={headingClass}>2. Proveedor técnico de la aplicación</h2>
            <p className={paragraphClass}>
              Código, base de datos, despliegues, mantenimiento técnico y soporte de la
              plataforma son gestionados por <strong>{PUBLIC_TECHNICAL_MAINTAINER.name}</strong>,
              que actúa por cuenta de Egadisailing como encargado del tratamiento cuando
              accede a datos personales para mantenimiento, seguridad, backup o asistencia.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Categorías de datos</p>
            <h2 className={headingClass}>3. Datos personales tratados</h2>
            <ul className={listClass}>
              <li><strong>Reservas:</strong> nombre, apellidos, email, teléfono, experiencia, barco, fecha, participantes, importes, estado, código de reserva y consentimientos.</li>
              <li><strong>Pagos:</strong> importe, moneda, estado del pago y referencias técnicas de Stripe. Los datos completos de la tarjeta no se guardan en servidores Egadisailing.</li>
              <li><strong>Contactos:</strong> nombre, email, teléfono si se indica, asunto y mensaje.</li>
              <li><strong>Recuperación de reserva:</strong> email, OTP en formato hash, sesión temporal, IP y user-agent por seguridad.</li>
              <li><strong>Cookies y seguridad:</strong> preferencias de consentimiento, idioma, logs técnicos, rate limit, tokens de sesión y datos mínimos para prevenir abuso, spam y fraude.</li>
              <li><strong>Canales externos:</strong> si la reserva llega desde plataformas conectadas, pueden tratarse datos recibidos de Bokun, Boataround, SamBoat, Click&Boat, Nautal u otros partners.</li>
            </ul>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Finalidades</p>
            <h2 className={headingClass}>4. Finalidades y bases jurídicas</h2>
            <LegalTable headers={["Finalidad", "Base jurídica"]}>
              <tr><Td>Gestionar solicitudes, presupuestos y comunicaciones precontractuales</Td><Td>Medidas precontractuales - art. 6.1.b RGPD</Td></tr>
              <tr><Td>Crear y gestionar reservas, pagos, saldo y asistencia al cliente</Td><Td>Ejecución del contrato - art. 6.1.b RGPD</Td></tr>
              <tr><Td>Enviar emails transaccionales: confirmaciones, recordatorios, reembolsos y cambios</Td><Td>Ejecución del contrato y obligaciones de servicio</Td></tr>
              <tr><Td>Cumplimientos fiscales, contables y administrativos</Td><Td>Obligación legal - art. 6.1.c RGPD</Td></tr>
              <tr><Td>Seguridad, prevención de fraude, anti-spam y auditoría técnica</Td><Td>Interés legítimo - art. 6.1.f RGPD</Td></tr>
              <tr><Td>Cookies analíticas o marketing, si se configuran y aceptan</Td><Td>Consentimiento - art. 6.1.a RGPD y normativa ePrivacy</Td></tr>
            </LegalTable>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Destinatarios y transferencias</p>
            <h2 className={headingClass}>5. Proveedores y servicios externos</h2>
            <p className={paragraphClass}>
              Los datos pueden comunicarse a proveedores necesarios para prestar el servicio:
              Stripe para pagos, Brevo u otros proveedores de email transaccional, Cloudflare para
              DNS/CDN, seguridad, rendimiento y estadísticas edge agregadas en el panel admin,
              Cloudflare Turnstile para protección anti-bot, hosting/database, Google Maps,
              herramientas de seguridad y plataformas de reservas conectadas. Algunos proveedores
              pueden operar fuera del Espacio Económico Europeo con garantías aplicables, como DPF,
              SCC u otros mecanismos previstos por la normativa.
            </p>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Conservación</p>
            <h2 className={headingClass}>6. Plazos de conservación</h2>
            <ul className={listClass}>
              <li>Datos fiscales y de reserva: hasta los plazos legales aplicables.</li>
              <li>OTP, sesiones temporales, logs técnicos y rate limit: por plazos breves y proporcionales a seguridad y asistencia.</li>
              <li>Consentimientos cookie y legal: durante el periodo necesario para demostrar la preferencia o aceptación.</li>
              <li>Los datos pueden anonimizarse o eliminarse cuando ya no sean necesarios.</li>
            </ul>
          </section>

          <section className={sectionClass}>
            <p className={eyebrowClass}>Derechos</p>
            <h2 className={headingClass}>7. Derechos de las personas interesadas</h2>
            <p className={paragraphClass}>
              Puedes solicitar acceso, rectificación, supresión, limitación, oposición,
              portabilidad cuando proceda y revocar consentimientos. También puedes reclamar ante
              la autoridad de control competente. Para ejercer tus derechos escribe a{" "}
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

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale === "es") return <SpanishPrivacyPolicyPage />;
  if (locale === "fr") return <FrenchPrivacyPolicyPage />;
  if (locale === "de") return <GermanPrivacyPolicyPage />;

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
                <Td>
                  Statistiche tecniche aggregate su traffico, performance, cache e codici di
                  risposta tramite Cloudflare Analytics edge
                </Td>
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
                proxy/CDN ove attivo, performance e statistiche tecniche aggregate edge
                mostrate solo nel pannello admin.
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
