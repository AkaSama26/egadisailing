"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  OverrideOtaChecklist,
  type OtaConfirmationState,
  type OtaConflictData,
} from "@/components/admin/override-ota-checklist";
import { approveOverrideAction, rejectOverrideAction } from "../actions";

export interface OverrideDetailData {
  id: string;
  status: string;
  newBookingRevenue: string;
  conflictingRevenueTotal: string;
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
      <h1 className="text-3xl font-bold text-slate-900">
        Override request {request.id.slice(0, 8)}
      </h1>
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div>
          <strong>Status:</strong> {request.status}
        </div>
        <div>
          <strong>Nuovo booking:</strong> {request.newBookingCode} &middot;{" "}
          {request.newBookingCustomer} &middot; {request.newBookingServiceName} &middot;{" "}
          {request.newBookingStartDate} &middot; {request.newBookingNumPeople} persone
        </div>
        <div>
          <strong>Revenue nuovo:</strong> &euro; {request.newBookingRevenue} &middot;{" "}
          <strong>Conflict:</strong> &euro; {request.conflictingRevenueTotal} &middot;{" "}
          <strong>Delta:</strong> &euro;{" "}
          {(
            parseFloat(request.newBookingRevenue) - parseFloat(request.conflictingRevenueTotal)
          ).toFixed(2)}
        </div>
        <div>
          <strong>Drop-dead:</strong> {request.dropDeadAt.slice(0, 10)}
        </div>
        <div>
          <strong>Sorgenti conflict:</strong> {request.conflictSourceChannels.join(", ") || "—"}
        </div>
        {request.decisionNotes && (
          <div>
            <strong>Note decisione:</strong> {request.decisionNotes}
          </div>
        )}
      </div>

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
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
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
            <div
              role={feedback.type === "error" ? "alert" : "status"}
              className={`p-2 rounded text-sm ${feedback.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
            >
              {feedback.msg}
            </div>
          )}
          <div className="flex gap-3">
            <Button
              disabled={!allChecked || pending}
              onClick={handleApprove}
              variant="default"
            >
              ✓ Approva
            </Button>
            <Button disabled={pending} onClick={handleReject} variant="destructive">
              ✗ Rifiuta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
