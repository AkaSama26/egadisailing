"use client";

import { useEffect, useId, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
          action?: string;
          "response-field"?: boolean;
          "response-field-name"?: string;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetProps {
  /** Chiave pubblica del sito Cloudflare Turnstile. */
  siteKey: string;
  /**
   * Chiamato con il token appena il widget completa la challenge. Il caller
   * deve conservarlo e passarlo al body della richiesta server.
   */
  onToken?: (token: string) => void;
  /** Chiamato se il token scade (5 minuti) — il caller deve gestire re-invito. */
  onExpired?: () => void;
  /** Chiamato su errore di rendering/challenge. */
  onError?: () => void;
  /**
   * Nome del field hidden iniettato nel form (`cf-turnstile-response` di default).
   * Utile quando il form usa `FormData` server-side senza custom callback.
   */
  responseFieldName?: string;
  /** Tema visuale; default auto (rispetta prefers-color-scheme). */
  theme?: "light" | "dark" | "auto";
  className?: string;
}

/**
 * Widget Cloudflare Turnstile integrato via API esplicita.
 *
 * Pattern: carica lo script Cloudflare con `next/script` strategy lazyOnload,
 * poi al mount renderizza il widget dentro un div stabile (id via useId).
 * Al unmount rimuove il widget (cleanup critico su pagine single-form che
 * possono smontare/rimontare — evita doppio rendering).
 *
 * In dev, se `siteKey` e' un dummy Cloudflare (`1x0000...`), il widget passa
 * sempre — comportamento voluto per flussi sviluppo.
 */
export function TurnstileWidget(props: TurnstileWidgetProps) {
  const containerId = useId();
  const widgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function tryRender() {
      if (cancelled) return;
      if (!window.turnstile) {
        // Lo script non e' ancora caricato — ritenta tra poco.
        setTimeout(tryRender, 100);
        return;
      }
      if (renderedRef.current) return;
      renderedRef.current = true;
      try {
        widgetIdRef.current = window.turnstile.render(`#${CSS.escape(containerId)}`, {
          sitekey: props.siteKey,
          theme: props.theme ?? "auto",
          "response-field": true,
          "response-field-name": props.responseFieldName ?? "cf-turnstile-response",
          callback: (token: string) => props.onToken?.(token),
          "expired-callback": () => props.onExpired?.(),
          "error-callback": () => props.onError?.(),
        });
      } catch (err) {
        // Fallimenti di rendering (es. siteKey errata) → chiama onError cosi'
        // il caller puo' mostrare fallback UI. Non throw (non vogliamo crash React).
        console.error("[Turnstile] render failed", err);
        props.onError?.();
      }
    }

    tryRender();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore: widget gia' rimosso
        }
      }
      widgetIdRef.current = null;
      renderedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.siteKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        async
        defer
      />
      <div id={containerId} className={props.className} />
    </>
  );
}
