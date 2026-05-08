"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import { sendContactMessage, type ContactFormState } from "./actions";

const initialState: ContactFormState = { status: "idle" };

export interface ContactFormProps {
  turnstileSiteKey: string;
  locale: string;
}

export function ContactForm({ turnstileSiteKey, locale }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const copy = {
    sentTitle: isEs ? "Mensaje recibido" : isFr ? "Message reçu" : isEn ? "Message received" : "Messaggio ricevuto",
    name: isEs ? "Nombre *" : isFr ? "Nom *" : isEn ? "Name *" : "Nome *",
    namePlaceholder: isEs ? "Tu nombre" : isFr ? "Votre nom" : isEn ? "Your name" : "Il tuo nome",
    emailPlaceholder: isEs ? "Tu email" : isFr ? "Votre email" : isEn ? "Your email" : "La tua email",
    phone: isEs ? "Teléfono (opcional)" : isFr ? "Téléphone (optionnel)" : isEn ? "Phone (optional)" : "Telefono (opzionale)",
    subject: isEs ? "Asunto *" : isFr ? "Objet *" : isEn ? "Subject *" : "Oggetto *",
    subjectPlaceholder: isEs ? "Reserva / Información / Grupos / ..." : isFr ? "Réservation / Informations / Groupes / ..." : isEn ? "Booking / Information / Groups / ..." : "Prenotazione / Informazioni / Gruppi / ...",
    message: isEs ? "Mensaje *" : isFr ? "Message *" : isEn ? "Message *" : "Messaggio *",
    messagePlaceholder: isEs ? "Cuéntanos qué estás buscando..." : isFr ? "Dites-nous ce que vous cherchez..." : isEn ? "Tell us what you are looking for..." : "Raccontaci cosa cerchi...",
    sending: isEs ? "Enviando..." : isFr ? "Envoi..." : isEn ? "Sending..." : "Invio...",
    send: isEs ? "Enviar mensaje" : isFr ? "Envoyer le message" : isEn ? "Send message" : "Invia messaggio",
  };

  if (state.status === "sent") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-100"
      >
        <h3 className="font-semibold text-lg mb-2">{copy.sentTitle}</h3>
        <p className="text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="locale" value={isEs ? "es" : isFr ? "fr" : isEn ? "en" : "it"} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-white/50 text-sm">
            {copy.name}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            placeholder={copy.namePlaceholder}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-white/50 text-sm">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={320}
            placeholder={copy.emailPlaceholder}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-white/50 text-sm">
          {copy.phone}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          maxLength={32}
          placeholder="+39 ..."
          className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="subject" className="text-white/50 text-sm">
          {copy.subject}
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          minLength={3}
          maxLength={200}
          placeholder={copy.subjectPlaceholder}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-white/50 text-sm">
          {copy.message}
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder={copy.messagePlaceholder}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors resize-none"
        />
      </div>

      {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} theme="dark" />}

      {state.status === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 rounded-lg bg-red-500/15 border border-red-400/30 text-red-100 text-sm"
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 text-[var(--color-ocean)] font-semibold text-lg transition-colors shadow-lg disabled:opacity-50"
      >
        <Send className="h-5 w-5" />
        {pending ? copy.sending : copy.send}
      </button>
    </form>
  );
}
