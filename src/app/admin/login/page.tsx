"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Eye, EyeOff, Ship } from "lucide-react";

function safeAdminRedirectTarget(rawCallbackUrl: string | null): string {
  if (!rawCallbackUrl) return "/admin";

  try {
    const parsed = new URL(rawCallbackUrl, window.location.origin);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (parsed.origin !== window.location.origin) return "/admin";
    if (!parsed.pathname.startsWith("/admin")) return "/admin";
    if (parsed.pathname === "/admin/login") return "/admin";
    return path;
  } catch {
    return "/admin";
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      // Gestione esaustiva dei fallimenti:
      //  - result undefined -> network error / signIn throw silenziato
      //  - result.error settato -> credentials mismatch / user bloccato
      //  - result.ok false senza error -> edge NextAuth
      if (!result) {
        setLoading(false);
        setError(
          "Errore di connessione. Riprova tra qualche secondo o verifica la tua rete.",
        );
        return;
      }
      if (result.error || result.ok === false) {
        setLoading(false);
        // Per sicurezza (anti email-enumeration) non distinguiamo "email non
        // esistente" da "password errata" - messaggio unificato.
        if (
          result.error === "CredentialsSignin" ||
          result.error === "Configuration"
        ) {
          setError(
            "Credenziali non valide. Verifica email e password e riprova.",
          );
        } else {
          setError(
            `Login non riuscito: ${result.error ?? "motivo sconosciuto"}. Contatta l'amministratore se il problema persiste.`,
          );
        }
        return;
      }

      // Round 11 Reg-A2: previene redirect loop per utenti con role != ADMIN.
      // Se domani l'enum User.role ammette VIEWER/EDITOR, o un bug DB-side
      // cambia il role, la redirect a /admin viene rimbalzata dal middleware
      // su /admin/login -> loop. Fail-fast qui con messaggio esplicito.
      const session = await getSession();
      if (!session) {
        setLoading(false);
        setError(
          "Sessione non creata dopo il login. Ricarica la pagina e riprova.",
        );
        return;
      }
      if (session.user?.role !== "ADMIN") {
        setLoading(false);
        setError(
          "Accesso negato: il tuo account non ha i permessi di amministratore.",
        );
        return;
      }

      // Successo: mostra feedback visivo + redirect dopo breve delay cosi'
      // il messaggio e' percepibile (250ms e' sotto la soglia di frustrazione
      // ma sufficiente per essere notato).
      setSuccess(`Accesso effettuato come ${session.user.email ?? "admin"}. Reindirizzamento...`);
      setTimeout(() => {
        const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
        window.location.replace(safeAdminRedirectTarget(callbackUrl));
      }, 150);
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error
          ? `Errore imprevisto: ${err.message}`
          : "Errore imprevisto durante il login. Riprova o ricarica la pagina.",
      );
    }
  }

  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2 font-heading font-bold text-lg">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-ocean)] text-white">
              <Ship className="size-4" aria-hidden="true" />
            </div>
            Egadisailing
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldGroup>
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Area riservata
                  </h1>
                  <p className="text-sm text-balance text-slate-500">
                    Accedi alla dashboard di gestione
                  </p>
                </div>
                <Field suppressHydrationWarning>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@egadisailing.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    suppressHydrationWarning
                  />
                </Field>
                <Field suppressHydrationWarning>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-11"
                      suppressHydrationWarning
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </Field>
                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}
                {success && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                  >
                    {success}
                  </div>
                )}
                <Field>
                  <Button type="submit" className="w-full" disabled={loading || !!success}>
                    {success
                      ? "Reindirizzamento..."
                      : loading
                        ? "Accesso in corso..."
                        : "Accedi"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-svh overflow-hidden bg-slate-950 lg:block">
        <Image
          src="/images/home/traimarano-levanzo.webp"
          alt="Trimarano davanti alle isole Egadi"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-950/20 to-cyan-950/25" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/70">
            Egadisailing operations
          </p>
          <p className="mt-3 max-w-xl text-3xl font-semibold leading-tight">
            Prenotazioni, meteo e disponibilita' in un solo pannello.
          </p>
        </div>
      </div>
    </div>
  );
}
