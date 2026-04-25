"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OverrideOtaChecklist,
  type OtaConfirmationState,
  type OtaConflictData,
} from "@/components/admin/override-ota-checklist";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminAlert } from "@/components/admin/admin-alert";
import { DetailRow } from "@/components/admin/detail-row";
import { StatusBadge } from "@/components/admin/status-badge";
import { approveOverrideAction, rejectOverrideAction } from "../actions";

export interface OverrideDetailData {
  id: string;
  status: string;
  newBookingRevenue: string;
  conflictingRevenueTotal: string;
  deltaRevenue: string;
  conflictSourceChannels: string[];
  newBookingCode: string;
  newBookingCustomer: string;
  newBookingServiceName: string;
  newBookingStartDate: string;
  newBookingNumPeople: number;
  dropDeadAt: string;
  decisionNotes: string | null;
}

export function OverrideDetailClient({
  request,
  otaConflicts,
}: {
  request: OverrideDetailData;
  otaConflicts: OtaConflictData[];
}) {
  const router = useRouter();
  const [otaStates, setOtaStates] = useState<OtaConfirmationState[]>([]);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  const allChecked =
    otaConflicts.length === 0 ||
    (otaStates.length === otaConflicts.length &&
      otaStates.every(
        (s) => s.panelOpened && s.upstreamCancelled && s.refundVerified && s.adminDeclared,
      ));

  const canAct = request.status === "PENDING";

  async function handleApprove() {
    startTransition(async () => {
      const res = await approveOverrideAction({
        requestId: request.id,
        notes: notes || undefined,
        otaConfirmations: otaStates,
      });
      if (res.ok) {
        setFeedback({ type: "ok", msg: "Override approvato." });
        router.refresh();
      } else {
        setFeedback({ type: "error", msg: res.message });
      }
    });
  }

  async function handleReject() {
    startTransition(async () => {
      const res = await rejectOverrideAction({
        requestId: request.id,
        notes: notes || undefined,
      });
      if (res.ok) {
        setFeedback({ type: "ok", msg: "Override rifiutato." });
        router.refresh();
      } else {
        setFeedback({ type: "error", msg: res.message });
      }
    });
  }

  return (
    <div className="space-y-6">
      <h1 id="main" className="text-3xl font-bold text-slate-900">
        Override per prenotazione {request.newBookingCode}
      </h1>
      <AdminCard padding="sm" className="space-y-2">
        <DetailRow label="Status" value={<StatusBadge status={request.status} kind="override" />} />
        <DetailRow
          label="Nuovo booking"
          value={`${request.newBookingCode} · ${request.newBookingCustomer} · ${request.newBookingServiceName} · ${request.newBookingStartDate} · ${request.newBookingNumPeople} persone`}
        />
        <DetailRow label="Revenue nuovo" value={`€ ${request.newBookingRevenue}`} />
        <DetailRow label="Revenue conflict" value={`€ ${request.conflictingRevenueTotal}`} />
        <DetailRow label="Delta approvando" value={`€ ${request.deltaRevenue}`} />
        <DetailRow label="Drop-dead" value={request.dropDeadAt.slice(0, 10)} />
        <DetailRow
          label="Sorgenti conflict"
          value={request.conflictSourceChannels.join(", ") || "—"}
        />
        {request.decisionNotes && (
          <DetailRow label="Note decisione" value={request.decisionNotes} />
        )}
      </AdminCard>

      {otaConflicts.length > 0 && canAct && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Conflitti OTA — checklist manuale</h2>
          <OverrideOtaChecklist
            requestId={request.id}
            conflicts={otaConflicts}
            onChange={setOtaStates}
          />
        </section>
      )}

      {canAct && (
        <AdminCard padding="sm" className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Note decisione (opzionale)</span>
            <textarea
              className="mt-1 w-full rounded border border-slate-300 p-2"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </label>
          {feedback && (
            <AdminAlert variant={feedback.type === "ok" ? "success" : "error"}>
              {feedback.msg}
            </AdminAlert>
          )}
          <div className="flex gap-3">
            <Button
              disabled={!allChecked || pending}
              onClick={handleApprove}
              variant="default"
            >
              <Check className="size-4 mr-2" /> Approva
            </Button>
            <Button disabled={pending} onClick={handleReject} variant="destructive">
              <X className="size-4 mr-2" /> Rifiuta
            </Button>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
