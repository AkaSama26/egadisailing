import { env } from "@/lib/env";
import { RecuperaPrenotazioneClient } from "./client";

export default function RecuperaPrenotazionePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold mb-2">Recupera la tua prenotazione</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Inserisci l&apos;email usata al momento della prenotazione. Ti invieremo un codice di
          verifica valido per 15 minuti.
        </p>
        <RecuperaPrenotazioneClient turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />
      </div>
    </div>
  );
}
