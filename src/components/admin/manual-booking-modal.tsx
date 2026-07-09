"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Euro, Save, Users, X } from "lucide-react";
import {
  createManualBookingAction,
  quoteManualBookingPriceAction,
} from "@/app/admin/(dashboard)/calendario/actions";
import { SERVICE_TYPE_LABEL, labelOrRaw } from "@/lib/admin/labels";
import { formatItDay } from "@/lib/dates";

export interface ManualBookingServiceOption {
  id: string;
  name: string;
  type: string;
  boatId: string;
  capacityMax: number;
}

export interface ManualBookingModalProps {
  boatId: string;
  boatName: string;
  date: Date;
  dateIso: string;
  services: ManualBookingServiceOption[];
  initialServiceId?: string | null;
  onClose: () => void;
}

function parseMoney(value: string): number {
  return Number(value.replace(",", "."));
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return Math.max(0, value).toFixed(2);
}

function calcBalance(total: string, deposit: string): string {
  return formatMoney(parseMoney(total || "0") - parseMoney(deposit || "0"));
}

export function ManualBookingModal({
  boatId,
  boatName,
  date,
  dateIso,
  services,
  initialServiceId,
  onClose,
}: ManualBookingModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const compatibleServices = useMemo(
    () => services.filter((service) => service.boatId === boatId),
    [boatId, services],
  );
  const defaultServiceId = useMemo(() => {
    if (initialServiceId && compatibleServices.some((s) => s.id === initialServiceId)) {
      return initialServiceId;
    }
    return compatibleServices[0]?.id ?? "";
  }, [compatibleServices, initialServiceId]);

  const [serviceId, setServiceId] = useState(defaultServiceId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState("1");
  const [totalEur, setTotalEur] = useState("0.00");
  const [depositEur, setDepositEur] = useState("0.00");
  const [balanceEur, setBalanceEur] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [note, setNote] = useState("");
  const [totalTouched, setTotalTouched] = useState(false);
  const [balanceTouched, setBalanceTouched] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const totalTouchedRef = useRef(totalTouched);
  const balanceTouchedRef = useRef(balanceTouched);
  const totalEurRef = useRef(totalEur);
  const depositEurRef = useRef(depositEur);

  const selectedService = compatibleServices.find((service) => service.id === serviceId) ?? null;
  const seatsNumber = Number.parseInt(seats, 10);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const firstControl = dialog?.querySelector<HTMLElement>(
      "select, input, textarea, button:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    firstControl?.focus();

    return () => {
      const cell = document.getElementById(`cell-${boatId}-${dateIso}`);
      cell?.focus();
    };
  }, [boatId, dateIso]);

  useEffect(() => {
    setServiceId(defaultServiceId);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSeats("1");
    setTotalEur("0.00");
    setDepositEur("0.00");
    setBalanceEur("0.00");
    setPaymentMethod("CASH");
    setNote("");
    setTotalTouched(false);
    setBalanceTouched(false);
    setQuoteMessage(null);
    setError(null);
  }, [boatId, dateIso, defaultServiceId]);

  useEffect(() => {
    totalTouchedRef.current = totalTouched;
    balanceTouchedRef.current = balanceTouched;
    totalEurRef.current = totalEur;
    depositEurRef.current = depositEur;
  });

  useEffect(() => {
    if (!serviceId || !Number.isInteger(seatsNumber) || seatsNumber < 1) return;
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteMessage((current) => current ?? "Aggiorno suggerimento...");

    quoteManualBookingPriceAction({ serviceId, dateIso, seats: seatsNumber })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setQuoteMessage(result.message);
          return;
        }
        const data = result.data;
        if (!data) {
          setQuoteMessage("Prezzo suggerito non disponibile");
          return;
        }
        if (!data.available) {
          setQuoteMessage(data.message);
          return;
        }
        const suggestedTotal = formatMoney(data.totalPriceEur);
        if (!totalTouchedRef.current) {
          setTotalEur(suggestedTotal);
          if (!balanceTouchedRef.current) {
            setBalanceEur(calcBalance(suggestedTotal, depositEurRef.current));
          }
        } else if (!balanceTouchedRef.current) {
          setBalanceEur(calcBalance(totalEurRef.current, depositEurRef.current));
        }
        const unitLabel = data.pricingUnit === "PER_PACKAGE" ? "pacchetto" : "adulto";
        setQuoteMessage(
          `Suggerito: ${suggestedTotal} EUR (${formatMoney(data.unitPriceEur)} EUR/${unitLabel})`,
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setQuoteMessage(err instanceof Error ? err.message : "Prezzo non disponibile");
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateIso, seatsNumber, serviceId]);

  const handleServiceChange = (value: string) => {
    setServiceId(value);
    setTotalTouched(false);
    setBalanceTouched(false);
    setError(null);
  };

  const handleTotalChange = (value: string) => {
    setTotalTouched(true);
    setTotalEur(value);
    if (!balanceTouched) setBalanceEur(calcBalance(value, depositEur));
  };

  const handleDepositChange = (value: string) => {
    setDepositEur(value);
    if (!balanceTouched) setBalanceEur(calcBalance(totalEur, value));
  };

  const handleBalanceChange = (value: string) => {
    setBalanceTouched(true);
    setBalanceEur(value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedService) return;
    setSaving(true);
    setError(null);

    const result = await createManualBookingAction({
      boatId,
      serviceId,
      dateIso,
      seats: seatsNumber,
      customer: { firstName, lastName, email, phone },
      totalEur: parseMoney(totalEur),
      depositEur: parseMoney(depositEur),
      balanceEur: parseMoney(balanceEur),
      paymentMethod,
      note,
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-booking-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b bg-slate-50 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {boatName} · {formatItDay(date)}
            </p>
            <h2 id="manual-booking-title" className="mt-1 text-xl font-bold text-slate-950">
              Nuova prenotazione manuale
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900"
            aria-label="Chiudi"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        {compatibleServices.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            Nessun servizio attivo collegato a questa barca.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
              <label className="text-sm font-medium text-slate-700">
                Esperienza
                <select
                  value={serviceId}
                  onChange={(event) => handleServiceChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  required
                >
                  {compatibleServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} · {labelOrRaw(SERVICE_TYPE_LABEL, service.type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Posti occupati
                <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <Users className="mr-2 size-4 text-slate-400" aria-hidden="true" />
                  <input
                    value={seats}
                    onChange={(event) => setSeats(event.target.value)}
                    type="number"
                    min={1}
                    max={selectedService?.capacityMax ?? 100}
                    className="w-full border-0 p-0 text-sm outline-none"
                    required
                  />
                </div>
              </label>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Nome
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Cognome
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  autoComplete="family-name"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Telefono
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  autoComplete="tel"
                  required
                />
              </label>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              <label className="text-sm font-medium text-slate-700">
                Totale
                <MoneyInput value={totalEur} onChange={handleTotalChange} />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Acconto ricevuto
                <MoneyInput value={depositEur} onChange={handleDepositChange} />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Restante
                <MoneyInput value={balanceEur} onChange={handleBalanceChange} />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Metodo acconto
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as "CASH" | "BANK_TRANSFER")
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="CASH">Contanti</option>
                  <option value="BANK_TRANSFER">Bonifico</option>
                </select>
              </label>
            </section>

            <p
              aria-live="polite"
              className={`min-h-11 rounded-lg border px-3 py-2 text-sm ${
                quoteLoading
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : "border-blue-100 bg-blue-50 text-blue-800"
              }`}
            >
              {quoteLoading
                ? "Aggiorno suggerimento..."
                : (quoteMessage ?? "Prezzo suggerito in caricamento...")}
            </p>

            <label className="block text-sm font-medium text-slate-700">
              Note interne
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}

            <footer className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={saving || !selectedService}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="size-4" aria-hidden="true" />
                {saving ? "Salvataggio..." : "Salva prenotazione"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2">
      <Euro className="mr-2 size-4 text-slate-400" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        min={0}
        step="0.01"
        className="w-full border-0 p-0 text-sm outline-none"
        required
      />
    </div>
  );
}
