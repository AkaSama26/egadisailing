import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_EFFECTIVE_DATE,
  hasOptionalCookieConsentServices,
} from "@/lib/cookie-consent/policy";
import { getCookieConsentPublicServices } from "@/lib/cookie-consent/server";
import { getSiteVerificationConfig } from "@/lib/site-verification";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Cookie Policy",
    description:
      "Cookie utilizzati dal sito Egadisailing: tecnici, consenso privacy, antispam, pagamenti e tracker opzionali solo dopo consenso.",
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

  return (
    <div className="min-h-screen bg-white py-24 px-6">
      <article className="max-w-3xl mx-auto prose prose-slate">
        <h1 className="text-3xl font-bold text-slate-900">Cookie Policy</h1>
        <p className="text-sm text-slate-500">
          In vigore dal {COOKIE_CONSENT_EFFECTIVE_DATE}
        </p>

        <h2>Cosa sono i cookie</h2>
        <p>
          I cookie sono piccoli file di testo salvati sul tuo dispositivo. Egadisailing usa
          cookie tecnici necessari per sicurezza, sessioni, lingua, pagamenti e protezione
          anti-bot. Gli eventuali cookie analitici o marketing sono attivati solo dopo il
          tuo consenso esplicito.
        </p>

        <h2>Cookie tecnici (sempre attivi)</h2>
        <table className="text-sm">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Dominio</th>
              <th>Finalita'</th>
              <th>Durata</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>{COOKIE_CONSENT_COOKIE_NAME}</code>
              </td>
              <td>egadisailing.com</td>
              <td>Memorizza le preferenze cookie e il consenso espresso</td>
              <td>6 mesi</td>
            </tr>
            <tr>
              <td>
                <code>next-auth.session-token</code>
              </td>
              <td>egadisailing.com</td>
              <td>Sessione area admin (dashboard)</td>
              <td>8 ore</td>
            </tr>
            <tr>
              <td>
                <code>egadi-booking-session</code>
              </td>
              <td>egadisailing.com</td>
              <td>Sessione area cliente "Recupera prenotazione"</td>
              <td>7 giorni</td>
            </tr>
            <tr>
              <td>
                <code>NEXT_LOCALE</code>
              </td>
              <td>egadisailing.com</td>
              <td>Lingua selezionata (IT/EN)</td>
              <td>1 anno</td>
            </tr>
          </tbody>
        </table>

        {hasVerificationTags && (
          <>
            <h2>Tag di verifica proprieta'</h2>
            <p>
              Il sito puo' includere meta tag tecnici per verificare la proprieta' del
              dominio su Google Search Console, Bing Webmaster Tools e Meta Business.
              Questi tag sono presenti nel codice HTML della pagina, non impostano cookie
              e non attivano tracciamento pubblicitario.
            </p>
          </>
        )}

        <h2>Cookie opzionali (solo dopo consenso)</h2>
        {hasOptionalServices ? (
          <table className="text-sm">
            <thead>
              <tr>
                <th>Fornitore</th>
                <th>Cookie indicativi</th>
                <th>Finalita'</th>
                <th>Durata</th>
              </tr>
            </thead>
            <tbody>
              {services.gaMeasurementId && (
                <tr>
                  <td>Google Analytics 4</td>
                  <td>
                    <code>_ga</code>, <code>_ga_*</code>, <code>_gid</code>
                  </td>
                  <td>Misurazione aggregata di visite e performance del sito</td>
                  <td>Fino a 2 anni</td>
                </tr>
              )}
              {services.googleAdsId && (
                <tr>
                  <td>Google Ads</td>
                  <td>
                    <code>_gcl_*</code>
                  </td>
                  <td>Misurazione conversioni pubblicitarie</td>
                  <td>Fino a 90 giorni</td>
                </tr>
              )}
              {services.metaPixelId && (
                <tr>
                  <td>Meta Pixel</td>
                  <td>
                    <code>_fbp</code>, <code>_fbc</code>
                  </td>
                  <td>Misurazione conversioni e campagne Meta</td>
                  <td>Fino a 3 mesi</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <p>
            Al momento non sono configurati cookie analitici o marketing. Se saranno
            attivati, compariranno nel pannello preferenze e resteranno bloccati finche'
            non avrai espresso consenso.
          </p>
        )}

        <h2>Cookie di terze parti (antispam)</h2>
        <table className="text-sm">
          <thead>
            <tr>
              <th>Fornitore</th>
              <th>Finalita'</th>
              <th>Policy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Cloudflare Turnstile</strong>
              </td>
              <td>Verifica che l'utente sia umano (CAPTCHA invisibile)</td>
              <td>
                <a
                  href="https://www.cloudflare.com/privacypolicy/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  cloudflare.com/privacypolicy
                </a>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Stripe</strong>
              </td>
              <td>Gestione pagamenti (solo nelle pagine di checkout)</td>
              <td>
                <a
                  href="https://stripe.com/privacy"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  stripe.com/privacy
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <h2>Gestione consenso</h2>
        <p>
          Puoi modificare o revocare il consenso in qualsiasi momento dal link
          "Preferenze cookie" nel footer. Ogni scelta viene registrata con un identificativo
          consenso, versione della policy, categorie accettate/rifiutate, hash della
          configurazione mostrata, data e un hash dell'indirizzo IP per finalita' di prova
          e accountability GDPR.
        </p>

        <h2>Contatti</h2>
        <p>
          Per domande sulla cookie policy:{" "}
          <a href="mailto:privacy@egadisailing.com">privacy@egadisailing.com</a>.
        </p>
      </article>
    </div>
  );
}
