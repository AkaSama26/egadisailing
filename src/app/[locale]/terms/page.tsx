import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { CURRENT_POLICY_VERSION, EFFECTIVE_DATE } from "@/lib/legal/policy-version";
import { env } from "@/lib/env";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL, getEmailHref } from "@/lib/public-contact";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Termini e Condizioni",
    description:
      "Termini e condizioni di prenotazione Egadisailing — cancellazione, rimborsi, responsabilita' e meteo.",
    path: "/terms",
    locale,
  });
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-24 px-6">
      <article className="max-w-3xl mx-auto prose prose-slate">
        <h1 className="text-3xl font-bold text-slate-900">Termini e Condizioni</h1>
        <p className="text-sm text-slate-500">
          Versione {CURRENT_POLICY_VERSION} · In vigore dal {EFFECTIVE_DATE}
        </p>

        {env.NODE_ENV !== "production" && (
          <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <strong>Nota (dev/staging):</strong> testo placeholder. Il contenuto definitivo
            (cancellazione, policy rimborso, responsabilita', weather-guarantee) va fornito dal
            cliente prima del go-live produzione.
          </div>
        )}

        <h2>1. Oggetto del contratto</h2>
        <p>
          Il presente contratto disciplina la prenotazione di esperienze nautiche alle Isole Egadi
          erogate da <strong>{PUBLIC_COMPANY_LEGAL.name}</strong>, con sede legale in{" "}
          {PUBLIC_COMPANY_LEGAL.legalAddress}, P.IVA {PUBLIC_COMPANY_LEGAL.vatNumber}, PEC{" "}
          <a href={getEmailHref(PUBLIC_COMPANY_LEGAL.pec)}>{PUBLIC_COMPANY_LEGAL.pec}</a>,
          Codice Univoco {PUBLIC_COMPANY_LEGAL.recipientCode}.
        </p>

        <h2>2. Prenotazione e pagamento</h2>
        <ul>
          <li>La prenotazione si considera confermata al ricevimento del pagamento.</li>
          <li>
            Per i servizi con acconto (es. Charter), il saldo e' dovuto 7 giorni prima della
            data dell'esperienza.
          </li>
          <li>Tutti i prezzi sono espressi in Euro (EUR), IVA inclusa dove applicabile.</li>
        </ul>

        <h2>3. Cancellazione da parte del cliente</h2>
        <ul>
          <li>Fino a 15 giorni prima della partenza: rimborso completo.</li>
          <li>Da 14 a 7 giorni prima della partenza: rimborso del 50% dell'importo pagato.</li>
          <li>Da 6 giorni alla partenza e in caso di no-show: nessun rimborso.</li>
          <li>Il cambio data e' sempre gratuito, subordinatamente alla disponibilita' della nuova data.</li>
        </ul>

        <h2>4. Cancellazione per meteo avverso</h2>
        <p>
          In caso di condizioni meteo-marine incompatibili con la sicurezza della navigazione,
          Egadisailing si riserva di cancellare/riprogrammare l'uscita fino a 24h prima. Al cliente
          sara' offerto riprogrammazione gratuita o rimborso integrale.
        </p>

        <h2>5. Responsabilita'</h2>
        <p>
          Egadisailing dispone delle coperture assicurative previste dalla normativa italiana. Il
          cliente e' tenuto a rispettare le istruzioni dello skipper/equipaggio durante la
          navigazione. Egadisailing non risponde di perdita o danneggiamento di effetti personali
          lasciati a bordo.
        </p>

        <h2>6. Foro competente e legge applicabile</h2>
        <p>
          Il presente contratto e' regolato dalla legge italiana. Foro competente esclusivo:
          Trapani (Italia).
        </p>

        <h2>7. Contatti</h2>
        <p>
          Per questioni contrattuali:{" "}
          <a href={getEmailHref()}>{PUBLIC_CONTACT_EMAIL}</a>. PEC:{" "}
          <a href={getEmailHref(PUBLIC_COMPANY_LEGAL.pec)}>{PUBLIC_COMPANY_LEGAL.pec}</a>.
        </p>
      </article>
    </div>
  );
}
