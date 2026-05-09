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
  locale: string;
  turnstileSiteKey: string;
}

export function RecuperaPrenotazioneClient({
  locale,
  turnstileSiteKey,
}: RecuperaPrenotazioneClientProps) {
  const [reqState, requestAction, reqPending] = useActionState(requestOtp, initialRequest);
  const [verState, verifyAction, verPending] = useActionState(verifyOtpAndLogin, initialVerify);
  const [email, setEmail] = useState("");
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  // R15-UX-12: cooldown 60s dopo invio OTP per evitare spam click → 429
  // grezzo. Il timer parte al cambio di `reqState` a "sent".
  const [cooldown, setCooldown] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- Cooldown starts only after the server action confirms that the OTP was accepted. */
  useEffect(() => {
    // R15-REG-UX-12: deps su `sentAt` monotono. Un reinvio stessa email
    // genera nuovo sentAt server-side → React vede deps cambiate → effect
    // scatta → cooldown reset. Prima, deps `[status, email]` erano
    // Object.is stabili al reinvio → effect non scattava → cooldown rotto.
    if (reqState.status === "sent" && reqState.sentAt) {
      setCooldown(RESEND_COOLDOWN_S);
    }
  }, [reqState.status, reqState.sentAt]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
  const copy = {
    emailLabel: isEs ? "Email de la reserva" : isFr ? "Email de la réservation" : isDe ? "E-Mail der Buchung" : isEn ? "Booking email" : "Email della prenotazione",
    emailPlaceholder: isEn ? "you@email.com" : isDe ? "ihre@email.de" : "tu@email.com",
    sendCode: isEs ? "Enviar código" : isFr ? "Envoyer le code" : isDe ? "Code senden" : isEn ? "Send code" : "Invia codice",
    resendCode: isEs ? "Enviar de nuevo" : isFr ? "Renvoyer" : isDe ? "Erneut senden" : isEn ? "Send again" : "Reinvia codice",
    sending: isEs ? "Enviando..." : isFr ? "Envoi..." : isDe ? "Senden..." : isEn ? "Sending..." : "Invio...",
    resendIn: (seconds: number) =>
      isEs ? `Enviar de nuevo en ${seconds}s` : isFr ? `Renvoyer dans ${seconds}s` : isDe ? `Erneut senden in ${seconds}s` : isEn ? `Send again in ${seconds}s` : `Reinvia tra ${seconds}s`,
    sent: isEs
      ? "Si existe una reserva asociada a este email, recibirás un código. Revisa también spam y promociones."
      : isFr
      ? "Si une réservation est associée à cet email, vous recevrez un code. Vérifiez aussi les spams et promotions."
      : isDe
      ? "Wenn eine Buchung mit dieser E-Mail verknüpft ist, erhalten Sie einen Code. Prüfen Sie bitte auch Spam und Werbung."
      : isEn
      ? "If a booking exists for this email, you will receive a code. Check spam and promotions too."
      : "Se esiste una prenotazione associata a questa email, riceverai un codice. Controlla anche spam o promozioni.",
    codeTitle: isEs ? "Introduce el código" : isFr ? "Saisissez le code" : isDe ? "Code eingeben" : isEn ? "Enter the code" : "Inserisci il codice",
    codeText: isEs
      ? "Después de la verificación entrarás en tu área de reserva."
      : isFr
      ? "Après la vérification, vous accéderez à votre espace réservation."
      : isDe
      ? "Nach der Verifizierung öffnen Sie Ihren Buchungsbereich."
      : isEn
      ? "After verification you will enter your booking area."
      : "Una volta verificato il codice accederai alla tua area prenotazioni.",
    codeLabel: isEs ? "Código de 6 cifras" : isFr ? "Code à 6 chiffres" : isDe ? "6-stelliger Code" : isEn ? "6-digit code" : "Codice a 6 cifre",
    verifying: isEs ? "Comprobando..." : isFr ? "Vérification..." : isDe ? "Prüfen..." : isEn ? "Checking..." : "Verifica...",
    access: isEs ? "Abrir área de reserva" : isFr ? "Ouvrir l'espace réservation" : isDe ? "Buchungsbereich öffnen" : isEn ? "Open booking area" : "Accedi",
  };

  return (
    <div className="space-y-6">
      <form action={requestAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="block text-sm font-bold text-slate-800" htmlFor="req-email">
          {copy.emailLabel}
        </label>
        <input
          id="req-email"
          name="email"
          type="email"
          placeholder={copy.emailPlaceholder}
          required
          maxLength={320}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} />}
        <button
          type="submit"
          disabled={!canResend}
          className="inline-flex w-full items-center justify-center rounded-full bg-[#d97706] px-5 py-3 font-bold text-white transition hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reqPending
            ? copy.sending
            : cooldown > 0
              ? copy.resendIn(cooldown)
              : otpSent
                ? copy.resendCode
                : copy.sendCode}
        </button>
        {reqState.status === "sent" && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
          >
            {copy.sent}
            <br />
            <strong>{email || reqState.email}</strong>
          </div>
        )}
        {reqState.status === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {reqState.message}
          </div>
        )}
      </form>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-bold text-slate-950">{copy.codeTitle}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{copy.codeText}</p>
      </div>

      <form action={verifyAction} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <label className="block text-sm font-bold text-slate-800" htmlFor="ver-email">
          {copy.emailLabel}
        </label>
        <input
          id="ver-email"
          name="email"
          type="email"
          placeholder={copy.emailPlaceholder}
          required
          value={verifyEmail}
          readOnly={otpSent}
          onChange={(e) => !otpSent && setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition read-only:bg-slate-50 read-only:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        <label className="block text-sm font-bold text-slate-800" htmlFor="ver-code">
          {copy.codeLabel}
        </label>
        <input
          id="ver-code"
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="______"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-mono text-xl tracking-[8px] outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        <button
          type="submit"
          disabled={verPending}
          className="inline-flex w-full items-center justify-center rounded-full bg-[#0c3d5e] px-5 py-3 font-bold text-white transition hover:bg-[#082f49] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verPending ? copy.verifying : copy.access}
        </button>
        {verState.status === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {verState.message}
          </div>
        )}
      </form>
    </div>
  );
}
