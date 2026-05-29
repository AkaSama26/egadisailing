"use client";

import { useActionState } from "react";
import { resolveAlertFormAction } from "@/app/admin/(dashboard)/sync-log/actions";
import { SubmitButton } from "@/components/admin/submit-button";

export function ResolveAlertForm({ alertId }: { alertId: string }) {
  const [state, formAction] = useActionState(resolveAlertFormAction, null);

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="id" value={alertId} />
      <SubmitButton
        className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700"
        pendingLabel="Salvataggio..."
      >
        Segna come fatto
      </SubmitButton>
      {state && !state.ok && (
        <p className="max-w-48 text-xs text-red-700" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
