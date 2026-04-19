"use client";

import { useActionState, useEffect, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import {
  requestOtp,
  verifyOtpAndLogin,
  type RequestOtpState,
  type VerifyOtpState,
} from "./actions";

const initialRequest: RequestOtpState = { status: "idle" };
const initialVerify: VerifyOtpState = { status: "idle" };
const RESEND_COOLDOWN_S = 60;

export interface RecuperaPrenotazioneClientProps {
  turnstileSiteKey: string;
}

export function RecuperaPrenotazioneClient({ turnstileSiteKey }: RecuperaPrenotazioneClientProps) {
  const [reqState, requestAction, reqPending] = useActionState(requestOtp, initialRequest);
  const [verState, verifyAction, verPending] = useActionState(verifyOtpAndLogin, initialVerify);
  const [email, setEmail] = useState("");
  // R15-UX-12: cooldown 60s dopo invio OTP per evitare spam click → 429
  // grezzo. Il timer parte al cambio di `reqState` a "sent".
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    // R15-REG-UX-12: deps su `sentAt` monotono. Un reinvio stessa email
    // genera nuovo sentAt server-side → React vede deps cambiate → effect
    // scatta → cooldown reset. Prima, deps `[status, email]` erano
    // Object.is stabili al reinvio → effect non scattava → cooldown rotto.
    if (reqState.status === "sent" && reqState.sentAt) {
      setCooldown(RESEND_COOLDOWN_S);
    }
  }, [reqState.status, reqState.sentAt]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // R15-UX-13: una volta che il codice e' stato inviato, l'email viene
  // lock-ata nel form di verifica. Cambiare email senza ri-richiedere OTP
  // farebbe lookup con email != quella che ha ricevuto il codice → "codice
  // non valido" confusionario.
  //
  // R15-REG-UX-13: mostriamo l'email ORIGINALE digitata (`email` state
  // client) invece di `reqState.email` (normalizzata server-side:
  // `Mario+Promo@Gmail.com` → `mario@gmail.com`). Il lookup backend applica
  // comunque `normalizeEmail` → match garantito, ma l'utente vede quello
  // che ha scritto e non si confonde.
  const otpSent = reqState.status === "sent";
  // Email originale digitata dall'utente (anche post-invio); il lookup
  // backend applica normalizeEmail in modo equivalente.
  const verifyEmail = email;
  const canResend = !reqPending && cooldown === 0;

  return (
    <div>
      <form action={requestAction} className="space-y-3 mb-6">
        <label className="block text-sm font-medium" htmlFor="req-email">
          Email della prenotazione
        </label>
        <input
          id="req-email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          required
          maxLength={320}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300"
        />
        {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} />}
        <button
          disabled={!canResend}
          className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
        >
          {reqPending
            ? "Invio..."
            : cooldown > 0
              ? `Reinvia tra ${cooldown}s`
              : otpSent
                ? "Reinvia codice"
                : "Invia codice"}
        </button>
        {reqState.status === "sent" && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm"
          >
            Codice inviato a <strong>{reqState.email}</strong>. Controlla la tua email.
          </div>
        )}
        {reqState.status === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-lg bg-red-50 text-red-700 text-sm"
          >
            {reqState.message}
          </div>
        )}
      </form>

      <hr className="my-6" />

      <h2 className="text-lg font-semibold mb-3">Inserisci il codice</h2>
      <form action={verifyAction} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="ver-email">
          Email
        </label>
        <input
          id="ver-email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          required
          value={verifyEmail}
          readOnly={otpSent}
          onChange={(e) => !otpSent && setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 read-only:bg-gray-50 read-only:text-gray-600"
        />
        <label className="block text-sm font-medium" htmlFor="ver-code">
          Codice a 6 cifre
        </label>
        <input
          id="ver-code"
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="______"
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 tracking-[8px] text-center text-xl font-mono"
        />
        <button
          disabled={verPending}
          className="w-full py-3 rounded-full bg-[#0c3d5e] text-white font-bold disabled:opacity-50"
        >
          {verPending ? "Verifica..." : "Accedi"}
        </button>
        {verState.status === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-lg bg-red-50 text-red-700 text-sm"
          >
            {verState.message}
          </div>
        )}
      </form>
    </div>
  );
}
