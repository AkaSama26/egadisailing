"use client";

import { useActionState } from "react";
import {
  dismissFailedEmailFormAction,
  replaceRollbackDismissedEmailFormAction,
  retryFailedEmailFormAction,
} from "@/app/admin/(dashboard)/sync-log/actions";
import { SubmitButton } from "@/components/admin/submit-button";

export function EmailResolutionControls({ emailOutboxId }: { emailOutboxId: string }) {
  const [retryState, retryAction] = useActionState(retryFailedEmailFormAction, null);
  const [dismissState, dismissAction] = useActionState(dismissFailedEmailFormAction, null);

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <form action={retryAction} className="rounded border border-amber-200 bg-amber-50 p-3">
        <input type="hidden" name="id" value={emailOutboxId} />
        <label htmlFor={`retry-reason-${emailOutboxId}`} className="block text-xs font-semibold">
          Verifica effettuata prima del reinvio
        </label>
        <textarea
          id={`retry-reason-${emailOutboxId}`}
          name="reason"
          required
          minLength={5}
          maxLength={500}
          rows={2}
          className="mt-1 w-full rounded border border-amber-300 bg-white p-2 text-xs"
          placeholder="Es. nessuna consegna presente in Brevo"
        />
        <SubmitButton
          className="mt-2 rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800"
          pendingLabel="Accodo..."
        >
          Approva un solo retry
        </SubmitButton>
        {retryState && !retryState.ok && (
          <p className="mt-1 text-xs text-red-700" role="alert">
            {retryState.message}
          </p>
        )}
      </form>

      <form action={dismissAction} className="rounded border border-slate-200 bg-slate-50 p-3">
        <input type="hidden" name="id" value={emailOutboxId} />
        <label htmlFor={`dismiss-reason-${emailOutboxId}`} className="block text-xs font-semibold">
          Motivo chiusura senza invio
        </label>
        <textarea
          id={`dismiss-reason-${emailOutboxId}`}
          name="reason"
          required
          minLength={5}
          maxLength={500}
          rows={2}
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"
          placeholder="Es. prenotazione cancellata o comunicazione già inviata"
        />
        <SubmitButton
          className="mt-2 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-800"
          pendingLabel="Chiudo..."
        >
          Dismiss definitivo
        </SubmitButton>
        {dismissState && !dismissState.ok && (
          <p className="mt-1 text-xs text-red-700" role="alert">
            {dismissState.message}
          </p>
        )}
      </form>
    </div>
  );
}

export function RollbackEmailReplacementControl({
  emailOutboxId,
}: {
  emailOutboxId: string;
}) {
  const [state, action] = useActionState(
    replaceRollbackDismissedEmailFormAction,
    null,
  );

  return (
    <form action={action} className="mt-3 rounded border border-red-200 bg-red-50 p-3">
      <input type="hidden" name="id" value={emailOutboxId} />
      <label
        htmlFor={`replacement-reason-${emailOutboxId}`}
        className="block text-xs font-semibold"
      >
        Verifica Brevo per email futura dopo rollback tecnico
      </label>
      <textarea
        id={`replacement-reason-${emailOutboxId}`}
        name="reason"
        required
        minLength={5}
        maxLength={500}
        rows={2}
        className="mt-1 w-full rounded border border-red-300 bg-white p-2 text-xs"
        placeholder="Confermare che la comunicazione precedente non risulta consegnata in Brevo"
      />
      <SubmitButton
        className="mt-2 rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-800"
        pendingLabel="Creo..."
      >
        Crea un solo messaggio sostitutivo
      </SubmitButton>
      {state && !state.ok && (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
