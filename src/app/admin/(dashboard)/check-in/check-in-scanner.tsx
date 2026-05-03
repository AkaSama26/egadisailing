"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Keyboard,
  Loader2,
  RotateCcw,
  Square,
  Zap,
} from "lucide-react";

interface CheckInResponse {
  data: CheckInData;
}

interface CheckInErrorResponse {
  error?: {
    message?: string;
    code?: string;
  };
}

interface CheckInData {
  outcome: "CHECKED_IN" | "ALREADY_CHECKED_IN";
  booking: {
    id: string;
    confirmationCode: string;
    source: string;
    status: string;
    serviceName: string;
    boatName: string;
    startDate: string;
    endDate: string;
    slotLabel: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    numPeople: number;
    guestBreakdown: string;
    checkedInAt: string | null;
    checkedInBy: { name: string; email: string } | null;
  };
}

export function CheckInScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [result, setResult] = useState<CheckInData | null>(null);
  const [error, setError] = useState("");

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  useEffect(() => stopScanner, [stopScanner]);

  const submitPayload = useCallback(
    async (payload: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setProcessing(true);
      setError("");

      try {
        const res = await fetch("/api/admin/check-in", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ payload }),
        });
        const body = (await res.json().catch(() => ({}))) as CheckInResponse & CheckInErrorResponse;
        if (!res.ok) {
          throw new Error(body.error?.message ?? "Check-in non riuscito");
        }
        setResult(body.data);
      } catch (err) {
        setResult(null);
        setError((err as Error).message);
      } finally {
        processingRef.current = false;
        setProcessing(false);
      }
    },
    [],
  );

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    stopScanner();
    setResult(null);
    setError("");
    setScanning(true);

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (scanResult, _scanError, activeControls) => {
          if (!scanResult) return;
          activeControls.stop();
          controlsRef.current = null;
          setScanning(false);
          void submitPayload(scanResult.getText());
        },
      );
      controlsRef.current = controls;
      setTorchAvailable(Boolean(controls.switchTorch));
    } catch (err) {
      stopScanner();
      setError(cameraErrorMessage(err));
    }
  }, [stopScanner, submitPayload]);

  async function toggleTorch() {
    const controls = controlsRef.current;
    if (!controls?.switchTorch) return;
    const next = !torchOn;
    await controls.switchTorch(next);
    setTorchOn(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-950 sm:aspect-video">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950 text-white">
              <Camera className="size-10" aria-hidden="true" />
            </div>
          )}
          {processing && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/70 text-white">
              <Loader2 className="size-8 animate-spin" aria-hidden="true" />
            </div>
          )}
          {scanning && (
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startScanner}
            disabled={scanning || processing}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera className="size-4" aria-hidden="true" />
            Avvia scanner
          </button>
          <button
            type="button"
            onClick={stopScanner}
            disabled={!scanning}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Square className="size-4" aria-hidden="true" />
            Stop
          </button>
          {torchAvailable && (
            <button
              type="button"
              onClick={toggleTorch}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              <Zap className="size-4" aria-hidden="true" />
              {torchOn ? "Spegni luce" : "Luce"}
            </button>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const code = manualCode.trim();
            if (!code) return;
            stopScanner();
            void submitPayload(code);
          }}
        >
          <label htmlFor="manual-code" className="text-sm font-semibold text-slate-800">
            Codice manuale
          </label>
          <div className="flex gap-2">
            <input
              id="manual-code"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="ES-XXXXXXX"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
            />
            <button
              type="submit"
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Keyboard className="size-4" aria-hidden="true" />
              Check-in
            </button>
          </div>
        </form>

        <div aria-live="polite">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="size-5" aria-hidden="true" />
                QR non valido
              </div>
              <p className="mt-2">{error}</p>
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                result.outcome === "CHECKED_IN"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                {result.outcome === "CHECKED_IN" ? "Check-in registrato" : "Gia' registrato"}
              </div>
              <dl className="mt-4 grid gap-2 text-slate-950">
                <ResultRow label="Codice" value={result.booking.confirmationCode} mono />
                <ResultRow label="Cliente" value={result.booking.customerName} />
                <ResultRow label="Esperienza" value={result.booking.serviceName} />
                <ResultRow label="Barca" value={result.booking.boatName} />
                <ResultRow label="Data" value={formatDate(result.booking.startDate)} />
                <ResultRow label="Orario" value={result.booking.slotLabel} />
                <ResultRow label="Ospiti" value={result.booking.guestBreakdown} />
                <ResultRow
                  label="Check-in"
                  value={result.booking.checkedInAt ? formatDateTime(result.booking.checkedInAt) : "-"}
                />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/admin/prenotazioni/${result.booking.id}`}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  Apri prenotazione
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError("");
                    setManualCode("");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Nuovo scan
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ResultRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`font-semibold ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(iso));
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function cameraErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.toLowerCase().includes("permission")) {
    return "Permesso fotocamera negato.";
  }
  if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
    return "La fotocamera richiede HTTPS in produzione.";
  }
  return message || "Impossibile avviare la fotocamera.";
}
