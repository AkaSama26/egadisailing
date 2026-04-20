import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { EFFECTIVE_DATE } from "@/lib/legal/policy-version";
import { env } from "@/lib/env";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Cookie Policy",
    description:
      "Cookie utilizzati dal sito Egadisailing: tecnici (sessione NextAuth), antispam Cloudflare Turnstile.",
    path: "/cookie-policy",
    locale,
  });
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white py-24 px-6">
      <article className="max-w-3xl mx-auto prose prose-slate">
        <h1 className="text-3xl font-bold text-slate-900">Cookie Policy</h1>
        <p className="text-sm text-slate-500">In vigore dal {EFFECTIVE_DATE}</p>

        {env.NODE_ENV !== "production" && (
          <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <strong>Nota (dev/staging):</strong> testo placeholder. Aggiornare con cookie banner
            finale (es. Iubenda / Cookiebot) al go-live produzione.
          </div>
        )}

        <h2>Cosa sono i cookie</h2>
        <p>
          I cookie sono piccoli file di testo salvati sul tuo dispositivo. Li utilizziamo
          esclusivamente per finalita' tecniche (sessione utente) e anti-bot (protezione form).
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
          Non utilizziamo cookie analitici ne' di marketing. I cookie tecnici non richiedono
          consenso (art. 122 Codice Privacy) ma ti informiamo della loro presenza.
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
