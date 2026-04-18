"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Ship } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Email o password non validi");
      return;
    }

    // Round 11 Reg-A2: previene redirect loop per utenti con role != ADMIN.
    // Se domani l'enum User.role ammette VIEWER/EDITOR, o un bug DB-side
    // cambia il role, la redirect a /admin viene rimbalzata dal middleware
    // su /admin/login → loop. Fail-fast qui con messaggio esplicito.
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      setLoading(false);
      setError("Accesso negato: ruolo amministratore richiesto.");
      // Non facciamo signOut automatico per non perdere il session JWT in caso
      // di glitch transitorio; l'admin puo' riprovare o contattare tech.
      return;
    }

    setLoading(false);
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2 font-heading font-bold text-lg">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-ocean)] text-white">
              <Ship className="size-4" />
            </div>
            Egadisailing
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-2xl font-bold">Area Riservata</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Accedi alla dashboard di gestione
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@egadisailing.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
                <Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Accesso in corso..." : "Accedi"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </div>
        </div>
      </div>

      {/* Right: image */}
      <div className="relative hidden bg-[var(--color-ocean)] lg:flex lg:items-center lg:justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #071934 0%, #0c3d5e 50%, #071934 100%)",
          }}
        />
        <div className="relative z-10 p-12 text-center">
          <Image
            src="/images/trimarano.webp"
            alt="Trimarano Egadisailing"
            width={2752}
            height={1536}
            className="w-full max-w-lg h-auto drop-shadow-[0_20px_60px_rgba(14,165,233,0.3)]"
          />
          <p className="text-white/40 text-sm mt-8 tracking-wider">
            Dashboard di Gestione
          </p>
        </div>
        {/* Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full z-0"
          style={{
            background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
      </div>
    </div>
  );
}
