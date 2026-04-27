"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save, Trash2 } from "lucide-react";
import { upsertPricingPeriod, deletePricingPeriod } from "../actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getPriceUnitLabel } from "@/lib/services/display";

export interface PricingServiceOption {
  id: string;
  name: string;
  type: string;
  durationType: string;
  pricingUnit: string | null;
  boatName: string;
}

export interface PricingPeriodFormValue {
  id: string;
  serviceId: string;
  label: string;
  startDate: string;
  endDate: string;
  pricePerPerson: string;
  year: number;
}

interface PricingPeriodFormProps {
  services: PricingServiceOption[];
  initialValue?: PricingPeriodFormValue;
  mode: "create" | "edit";
}

const steps = ["Servizio", "Periodo", "Prezzo"];

function durationLabel(durationType: string) {
  switch (durationType) {
    case "FULL_DAY":
      return "Giornata intera";
    case "HALF_DAY_MORNING":
      return "Mattina";
    case "HALF_DAY_AFTERNOON":
      return "Pomeriggio";
    case "MULTI_DAY":
      return "Piu' giorni";
    case "WEEK":
      return "Settimana";
    default:
      return durationType;
  }
}

function defaultYear() {
  return new Date().getFullYear();
}

function normalizePrice(value: string) {
  return Number.parseFloat(value.replace(",", "."));
}

export function PricingPeriodForm({ services, initialValue, mode }: PricingPeriodFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(initialValue?.serviceId ?? services[0]?.id ?? "");
  const [label, setLabel] = useState(initialValue?.label ?? "");
  const [startDate, setStartDate] = useState(initialValue?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValue?.endDate ?? "");
  const [price, setPrice] = useState(initialValue?.pricePerPerson ?? "");
  const [year, setYear] = useState(String(initialValue?.year ?? defaultYear()));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );
  const unitLabel = getPriceUnitLabel(selectedService?.pricingUnit, selectedService?.type);
  const isDerivedBoatHalfDay =
    selectedService?.type.startsWith("BOAT_") &&
    (selectedService.durationType === "HALF_DAY_MORNING" ||
      selectedService.durationType === "HALF_DAY_AFTERNOON");

  const canMoveNext =
    step === 0
      ? Boolean(serviceId)
      : step === 1
        ? Boolean(label && startDate && endDate && year)
        : Boolean(price);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const result = await upsertPricingPeriod({
      id: initialValue?.id,
      serviceId,
      label,
      startDate,
      endDate,
      pricePerPerson: normalizePrice(price),
      year: Number.parseInt(year, 10),
    });
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(mode === "create" ? `/admin/prezzi/${result.data?.id}` : "/admin/prezzi");
    router.refresh();
  }

  async function remove() {
    if (!initialValue?.id) return;
    if (!window.confirm(`Eliminare il periodo "${initialValue.label}"?`)) return;
    setError("");
    setDeletePending(true);
    const result = await deletePricingPeriod({ id: initialValue.id });
    setDeletePending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push("/admin/prezzi");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {mode === "create" && (
        <div className="grid grid-cols-3 gap-2">
          {steps.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => setStep(index)}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium",
                index === step
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <span className="flex size-5 items-center justify-center rounded-full border border-current text-xs">
                {index + 1}
              </span>
              {name}
            </button>
          ))}
        </div>
      )}

      <div className={cn("space-y-5", mode === "create" && step !== 0 && "hidden")}>
        <div className="space-y-2">
          <Label htmlFor="serviceId">Servizio</Label>
          <select
            id="serviceId"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900"
            required
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.boatName} · {durationLabel(service.durationType)}
              </option>
            ))}
          </select>
        </div>

        {selectedService && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-900">{selectedService.name}</div>
            <div className="mt-1 text-slate-600">
              {selectedService.boatName} · {durationLabel(selectedService.durationType)} · {unitLabel}
            </div>
            {isDerivedBoatHalfDay && (
              <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                La mezza giornata barca viene calcolata al 75% del full-day corrispondente.
              </div>
            )}
            {selectedService.type === "CABIN_CHARTER" && (
              <div className="mt-2 rounded-md bg-sky-50 px-2 py-1 text-xs text-sky-800">
                Inserisci il prezzo di una singola giornata: il checkout moltiplica da 3 a 7
                giornate.
              </div>
            )}
          </div>
        )}
      </div>

      <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", mode === "create" && step !== 1 && "hidden")}>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="label">Nome periodo</Label>
          <Input
            id="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Bassa stagione"
            required
            maxLength={64}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Da</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">A</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Anno</Label>
          <Input
            id="year"
            type="number"
            min="2020"
            max="2100"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            required
          />
        </div>
      </div>

      <div className={cn("space-y-4", mode === "create" && step !== 2 && "hidden")}>
        <div className="space-y-2">
          <Label htmlFor="price">Prezzo {unitLabel}</Label>
          <Input
            id="price"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,2})?"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="1200,00"
            required
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {mode === "edit" && (
            <Button
              type="button"
              variant="destructive"
              onClick={remove}
              disabled={deletePending || pending}
            >
              <Trash2 className="size-4" />
              {deletePending ? "Eliminazione..." : "Elimina"}
            </Button>
          )}
        </div>

        {mode === "create" ? (
          <div className="flex justify-end gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>
                <ArrowLeft className="size-4" />
                Indietro
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((value) => value + 1)}
                disabled={!canMoveNext}
              >
                Avanti
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={pending || !canMoveNext}>
                <Check className="size-4" />
                {pending ? "Salvataggio..." : "Crea prezzo"}
              </Button>
            )}
          </div>
        ) : (
          <Button type="submit" disabled={pending}>
            <Save className="size-4" />
            {pending ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        )}
      </div>

      <Link href="/admin/prezzi" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}>
        Torna ai prezzi
      </Link>
    </form>
  );
}
