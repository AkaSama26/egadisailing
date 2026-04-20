import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { CURRENT_POLICY_VERSION, EFFECTIVE_DATE } from "@/lib/legal/policy-version";
import { env } from "@/lib/env";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Privacy Policy",
    description: "Informativa privacy di Egadisailing ai sensi del GDPR (Reg. UE 2016/679).",
    path: "/privacy",
    locale,
  });
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white py-24 px-6">
      <article className="max-w-3xl mx-auto prose prose-slate">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="text-sm text-slate-500">
          Versione {CURRENT_POLICY_VERSION} · In vigore dal {EFFECTIVE_DATE}
        </p>

        {env.NODE_ENV !== "production" && (
          <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <strong>Nota (dev/staging):</strong> questa privacy policy e' un placeholder
            strutturale. Il testo definitivo va fornito dal cliente / consulente legale prima
            del go-live produzione.
          </div>
        )}

        <h2>1. Titolare del trattamento</h2>
        <p>
          Il titolare del trattamento dei dati personali e' <strong>Egadisailing</strong>,
          contattabile all'indirizzo email <a href="mailto:info@egadisailing.com">info@egadisailing.com</a>.
        </p>

        <h2>2. Dati raccolti</h2>
        <p>Raccogliamo i seguenti dati quando prenoti un'esperienza:</p>
        <ul>
          <li>Dati anagrafici: nome, cognome, nazionalita' (facoltativo), lingua preferita</li>
          <li>Dati di contatto: email, numero di telefono (facoltativo)</li>
          <li>Dati di pagamento: gestiti direttamente da Stripe (non conservati sui nostri server)</li>
          <li>Dati tecnici: indirizzo IP, user-agent, log di accesso (anti-frode, 90 giorni)</li>
        </ul>

        <h2>3. Finalita' del trattamento</h2>
        <ul>
          <li>Erogazione del servizio di prenotazione (base giuridica: art. 6.1.b — esecuzione contratto)</li>
          <li>Adempimenti fiscali e contabili (art. 6.1.c — obblighi di legge, conservazione 10 anni art. 2220 c.c.)</li>
          <li>Comunicazioni transazionali (conferma prenotazione, promemoria saldo, annullamenti)</li>
          <li>Prevenzione frodi (art. 6.1.f — legittimo interesse)</li>
        </ul>

        <h2>4. Conservazione dei dati</h2>
        <p>
          Dati di prenotazione conservati 10 anni (obblighi fiscali). Dopo scadenza contratto i dati
          vengono anonimizzati. Log IP / antifraud: 90 giorni. Cache meteo: 14 giorni. OTP recovery
          code: 30 giorni.
        </p>

        <h2>5. Trasferimento a terzi</h2>
        <ul>
          <li>
            <strong>Stripe Inc.</strong> (USA): gestione pagamenti — SCC EU-US DPF
          </li>
          <li>
            <strong>Brevo</strong> (Francia): invio email transazionali
          </li>
          <li>
            <strong>Cloudflare Inc.</strong> (USA): protezione anti-bot (Turnstile) e CDN
          </li>
          <li>
            <strong>Bokun</strong>: partner di distribuzione OTA (Viator, GetYourGuide) se la
            prenotazione arriva da quei canali
          </li>
        </ul>

        <h2>6. Diritti dell'interessato</h2>
        <p>
          Ai sensi degli artt. 15-22 GDPR hai diritto a: accesso, rettifica, cancellazione,
          limitazione, portabilita', opposizione. Scrivi a{" "}
          <a href="mailto:privacy@egadisailing.com">privacy@egadisailing.com</a> specificando il
          codice prenotazione.
        </p>

        <h2>7. Reclami</h2>
        <p>
          Puoi proporre reclamo al Garante per la Protezione dei Dati Personali — {" "}
          <a href="https://www.garanteprivacy.it" rel="noopener noreferrer" target="_blank">
            garanteprivacy.it
          </a>
          .
        </p>

        <h2>8. Cookie</h2>
        <p>
          Consulta la nostra <a href="/cookie-policy">Cookie Policy</a> per il dettaglio dei
          cookie utilizzati.
        </p>
      </article>
    </div>
  );
}
