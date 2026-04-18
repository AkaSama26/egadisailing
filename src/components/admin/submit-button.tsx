"use client";

import { useFormStatus } from "react-dom";

/**
 * Bottone submit che si disabilita durante `action={...}` pending.
 * Previene double-submit (Round 10 UX-A1). `confirmMessage` opzionale
 * mostra `confirm()` nativo prima del submit (Round 10 UX-C1 per azioni
 * distruttive).
 */
export function SubmitButton({
  children,
  className,
  confirmMessage,
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ""} disabled:opacity-50 disabled:cursor-not-allowed`}
      onClick={(e) => {
        if (confirmMessage && !pending) {
          if (!window.confirm(confirmMessage)) {
            e.preventDefault();
          }
        }
      }}
    >
      {pending ? (pendingLabel ?? "Attendere...") : children}
    </button>
  );
}
