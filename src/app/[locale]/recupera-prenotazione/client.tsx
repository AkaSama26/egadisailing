"use client";

import { useActionState, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import {
  requestOtp,
  verifyOtpAndLogin,
  type RequestOtpState,
  type VerifyOtpState,
} from "./actions";

const initialRequest: RequestOtpState = { status: "idle" };
const initialVerify: VerifyOtpState = { status: "idle" };

export interface RecuperaPrenotazioneClientProps {
  turnstileSiteKey: string;
}

export function RecuperaPrenotazioneClient({ turnstileSiteKey }: RecuperaPrenotazioneClientProps) {
  const [reqState, requestAction, reqPending] = useActionState(requestOtp, initialRequest);
  const [verState, verifyAction, verPending] = useActionState(verifyOtpAndLogin, initialVerify);
  const [email, setEmail] = useState("");

  return (
    <div>
      <form action={requestAction} className="space-y-3 mb-6">
        <input
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
          disabled={reqPending}
          className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
        >
          {reqPending ? "Invio..." : "Invia codice"}
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
        <input
          name="email"
          type="email"
          placeholder="tu@email.com"
          required
          defaultValue={reqState.email ?? email}
          className="w-full px-4 py-3 rounded-lg border border-gray-300"
        />
        <input
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
