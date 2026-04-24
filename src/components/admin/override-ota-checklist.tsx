"use client";

import { useState, useEffect } from "react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminAlert } from "@/components/admin/admin-alert";

export interface OtaConflictData {
  conflictId: string;
  channel: string;
  externalRef: string;
  panelUrl: string;
  customerName: string;
  amount: string;
}

export interface OtaConfirmationState {
  conflictId: string;
  channel: string;
  externalRef: string;
  panelOpened: boolean;
  upstreamCancelled: boolean;
  refundVerified: boolean;
  adminDeclared: boolean;
}

interface WebhookStatusResponse {
  conflictId: string;
  source: string;
  upstreamCancelled: boolean;
  lastCheckedAt: string;
}

export function OverrideOtaChecklist({
  requestId,
  conflicts,
  onChange,
}: {
  requestId: string;
  conflicts: OtaConflictData[];
  onChange: (states: OtaConfirmationState[]) => void;
}) {
  const [states, setStates] = useState<OtaConfirmationState[]>(
    conflicts.map((c) => ({
      conflictId: c.conflictId,
      channel: c.channel,
      externalRef: c.externalRef,
      panelOpened: false,
      upstreamCancelled: false,
      refundVerified: false,
      adminDeclared: false,
    })),
  );
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatusResponse[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/admin/override-requests/${requestId}/webhook-status`);
        if (!res.ok) return;
        const data = (await res.json()) as WebhookStatusResponse[];
        if (!cancelled) setWebhookStatus(data);
      } catch {
        // network error - mantieni stato precedente
      }
    }
    void fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [requestId]);

  function updateState(conflictId: string, patch: Partial<OtaConfirmationState>) {
    const updated = states.map((s) =>
      s.conflictId === conflictId ? { ...s, ...patch } : s,
    );
    setStates(updated);
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      {conflicts.map((c) => {
        const state = states.find((s) => s.conflictId === c.conflictId);
        if (!state) return null;
        const webhook = webhookStatus.find((w) => w.conflictId === c.conflictId);
        const upstreamOk = webhook?.upstreamCancelled ?? false;
        return (
          <AdminCard key={c.conflictId} tone="warn" padding="sm">
            <h3 className="font-semibold">
              {c.channel} &mdash; {c.externalRef}
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Cliente upstream: {c.customerName} &middot; &euro; {c.amount}
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={state.panelOpened}
                  onChange={(e) => updateState(c.conflictId, { panelOpened: e.target.checked })}
                  className="mt-1"
                />
                <span>
                  1. Apri pannello:{" "}
                  {c.panelUrl ? (
                    <a href={c.panelUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline">
                      {c.panelUrl}
                    </a>
                  ) : (
                    <span className="italic">pannello esterno (accedi manualmente)</span>
                  )}
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={state.upstreamCancelled}
                  onChange={(e) => updateState(c.conflictId, { upstreamCancelled: e.target.checked })}
                  className="mt-1"
                />
                <span>2. Cancella #{c.externalRef} nel pannello</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={state.refundVerified}
                  onChange={(e) => updateState(c.conflictId, { refundVerified: e.target.checked })}
                  className="mt-1"
                />
                <span>3. Verifica rimborso &euro; {c.amount} processato</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={state.adminDeclared}
                  onChange={(e) => updateState(c.conflictId, { adminDeclared: e.target.checked })}
                  className="mt-1"
                />
                <span>4. Dichiaro di aver completato i 3 passaggi sotto mia responsabilita&apos;</span>
              </label>
            </div>
            <AdminAlert
              variant={upstreamOk ? "success" : "warn"}
              className="mt-3"
            >
              {upstreamOk
                ? `OK: cancel confermato upstream${webhook?.lastCheckedAt ? ` (${webhook.lastCheckedAt})` : ""}`
                : "Attesa webhook cancel dall'OTA (polling 15s)..."}
            </AdminAlert>
          </AdminCard>
        );
      })}
    </div>
  );
}
