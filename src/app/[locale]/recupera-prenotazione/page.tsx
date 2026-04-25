import type { Metadata } from "next";
import { env } from "@/lib/env";
import { RecuperaPrenotazioneClient } from "./client";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { CustomerCardLight } from "@/components/customer/customer-card-light";

// R26-A1-A5: auth-adjacent page, noindex defense-in-depth oltre robots.txt.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function RecuperaPrenotazionePage() {
  return (
    <OceanLayout>
      <CustomerCardLight padding="md" align="left">
        <h1 className="text-2xl font-bold mb-2">Recupera la tua prenotazione</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Inserisci l&apos;email usata al momento della prenotazione. Ti invieremo un codice di
          verifica valido per 15 minuti.
        </p>
        <RecuperaPrenotazioneClient turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />
      </CustomerCardLight>
    </OceanLayout>
  );
}
