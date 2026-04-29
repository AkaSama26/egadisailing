"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Users,
} from "lucide-react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { cn } from "@/lib/utils";

export interface BookingServiceOption {
  id: string;
  title: string;
  subtitle: string;
  boatId: string;
  boatTitle: string;
  serviceType: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  defaultPaymentSchedule: "FULL" | "DEPOSIT_BALANCE";
  defaultDepositPercentage: number | null;
  priceLabel: string;
  priceUnitLabel: string;
  durationLabel: string;
}

interface BookingPageClientProps {
  locale: string;
  services: BookingServiceOption[];
  initialServiceId?: string;
  initialBoatId?: string;
  initialExperienceKey?: string;
  initialDurationType?: string;
  turnstileSiteKey: string;
  appUrl: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialDurationDays?: number;
}

type SelectionStep = "boat" | "experience" | "duration" | "booking";

interface ExperienceOption {
  key: string;
  title: string;
  subtitle: string;
  services: BookingServiceOption[];
}

const CHARTER_DURATION_DAYS = [3, 4, 5, 6, 7] as const;

function paymentLabel(service: BookingServiceOption): string {
  if (service.defaultPaymentSchedule === "DEPOSIT_BALANCE") {
    const pct = service.defaultDepositPercentage ?? 30;
    return `Acconto ${pct}% oggi, saldo solo in loco`;
  }
  return "Pagamento completo al checkout";
}

function experienceKey(service: BookingServiceOption): string {
  if (service.serviceType === "BOAT_SHARED") return `${service.boatId}:BOAT_SHARED`;
  if (service.serviceType === "BOAT_EXCLUSIVE") return `${service.boatId}:BOAT_EXCLUSIVE`;
  return `${service.boatId}:${service.id}`;
}

function experienceTitle(service: BookingServiceOption): string {
  if (service.serviceType === "BOAT_SHARED") return "Barca condivisa";
  if (service.serviceType === "BOAT_EXCLUSIVE") return "Barca in esclusiva";
  return service.title;
}

function durationOptionLabel(service: BookingServiceOption): string {
  if (service.durationType === "FULL_DAY") return "Giornata intera";
  if (service.durationType === "HALF_DAY_MORNING") return "Mattina";
  if (service.durationType === "HALF_DAY_AFTERNOON") return "Pomeriggio";
  return service.durationLabel;
}

function durationDetail(service: BookingServiceOption): string {
  if (service.durationType === "FULL_DAY") return `${service.durationHours} ore`;
  if (service.durationType === "HALF_DAY_MORNING") return `${service.durationHours} ore`;
  if (service.durationType === "HALF_DAY_AFTERNOON") return `${service.durationHours} ore`;
  return service.durationLabel;
}

function sortServicesForDuration(a: BookingServiceOption, b: BookingServiceOption): number {
  const order: Record<string, number> = {
    FULL_DAY: 0,
    HALF_DAY_MORNING: 1,
    HALF_DAY_AFTERNOON: 2,
  };
  return (order[a.durationType] ?? 99) - (order[b.durationType] ?? 99);
}

function nextStepAfterExperience(services: BookingServiceOption[]): SelectionStep {
  if (services.length > 1) return "duration";
  if (services[0]?.serviceType === "CABIN_CHARTER") return "duration";
  return "booking";
}

export function BookingPageClient({
  locale,
  services,
  initialServiceId,
  initialBoatId,
  initialExperienceKey: requestedInitialExperienceKey,
  initialDurationType,
  turnstileSiteKey,
  appUrl,
  initialStartDate,
  initialEndDate,
  initialDurationDays,
}: BookingPageClientProps) {
  const requestedService = services.find((service) => service.id === initialServiceId);
  const validInitialBoatId =
    initialBoatId && services.some((service) => service.boatId === initialBoatId)
      ? initialBoatId
      : "";
  const matchedInitialExperienceService =
    !requestedService && requestedInitialExperienceKey
      ? services.find(
          (service) =>
            experienceKey(service) === requestedInitialExperienceKey &&
            (!validInitialBoatId || service.boatId === validInitialBoatId),
        )
      : undefined;
  const resolvedInitialBoatId =
    requestedService?.boatId ??
    (validInitialBoatId || matchedInitialExperienceService?.boatId || "");
  const resolvedInitialExperienceKey = requestedService
    ? experienceKey(requestedService)
    : matchedInitialExperienceService
      ? experienceKey(matchedInitialExperienceService)
      : "";
  const resolvedInitialExperienceServices = resolvedInitialExperienceKey
    ? services
        .filter(
          (service) =>
            service.boatId === resolvedInitialBoatId &&
            experienceKey(service) === resolvedInitialExperienceKey,
        )
        .sort(sortServicesForDuration)
    : [];
  const durationMatchedInitialService =
    !requestedService && initialDurationType
      ? resolvedInitialExperienceServices.find(
          (service) => service.durationType === initialDurationType,
        )
      : undefined;
  const singleInitialService =
    !requestedService &&
    !durationMatchedInitialService &&
    resolvedInitialExperienceServices.length === 1 &&
    nextStepAfterExperience(resolvedInitialExperienceServices) === "booking"
      ? resolvedInitialExperienceServices[0]
      : undefined;
  const resolvedInitialService =
    requestedService ?? durationMatchedInitialService ?? singleInitialService;
  const resolvedInitialStep: SelectionStep = resolvedInitialService
    ? "booking"
    : resolvedInitialExperienceServices.length > 0
      ? nextStepAfterExperience(resolvedInitialExperienceServices)
      : resolvedInitialBoatId
        ? "experience"
        : "boat";
  const [selectionStep, setSelectionStep] = useState<SelectionStep>(resolvedInitialStep);
  const [selectedBoatId, setSelectedBoatId] = useState(resolvedInitialBoatId);
  const [selectedExperienceKey, setSelectedExperienceKey] = useState(
    resolvedInitialExperienceKey,
  );
  const [selectedServiceId, setSelectedServiceId] = useState(resolvedInitialService?.id ?? "");
  const [selectedCharterDays, setSelectedCharterDays] = useState(initialDurationDays ?? 3);

  const boats = useMemo(() => {
    const map = new Map<string, { id: string; title: string; serviceCount: number }>();
    for (const service of services) {
      const current = map.get(service.boatId);
      map.set(service.boatId, {
        id: service.boatId,
        title: service.boatTitle,
        serviceCount: (current?.serviceCount ?? 0) + 1,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "it"));
  }, [services]);

  const selectedBoatServices = useMemo(
    () => services.filter((service) => service.boatId === selectedBoatId),
    [selectedBoatId, services],
  );

  const experienceOptions = useMemo(() => {
    const map = new Map<string, ExperienceOption>();
    for (const service of selectedBoatServices) {
      const key = experienceKey(service);
      const current = map.get(key);
      if (current) {
        current.services.push(service);
      } else {
        map.set(key, {
          key,
          title: experienceTitle(service),
          subtitle: service.subtitle,
          services: [service],
        });
      }
    }
    return Array.from(map.values()).map((option) => ({
      ...option,
      services: option.services.sort(sortServicesForDuration),
    }));
  }, [selectedBoatServices]);

  const selectedExperience = useMemo(
    () => experienceOptions.find((option) => option.key === selectedExperienceKey),
    [experienceOptions, selectedExperienceKey],
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [selectedServiceId, services],
  );

  const selectedBoatTitle =
    boats.find((boat) => boat.id === selectedBoatId)?.title ?? selectedService?.boatTitle ?? "";
  const needsDurationStep =
    Boolean(selectedExperience && nextStepAfterExperience(selectedExperience.services) === "duration");
  const selectedDurationLabel = selectedService
    ? selectedService.serviceType === "CABIN_CHARTER"
      ? `${selectedCharterDays} giornate`
      : `${durationOptionLabel(selectedService)} · ${durationDetail(selectedService)}`
    : "";
  const fixedDurationDays =
    selectedService?.serviceType === "CABIN_CHARTER" ? selectedCharterDays : undefined;

  function chooseBoat(boatId: string) {
    setSelectedBoatId(boatId);
    setSelectedExperienceKey("");
    setSelectedServiceId("");
  }

  function chooseExperience(option: ExperienceOption) {
    setSelectedExperienceKey(option.key);
    setSelectedServiceId(option.services.length === 1 ? option.services[0].id : "");
  }

  function continueFromExperience() {
    if (!selectedExperience) return;
    const next = nextStepAfterExperience(selectedExperience.services);
    if (next === "booking" && selectedExperience.services[0]) {
      setSelectedServiceId(selectedExperience.services[0].id);
    }
    setSelectionStep(next);
  }

  function resetToStep(step: SelectionStep) {
    if (step === "boat") {
      setSelectedBoatId("");
      setSelectedExperienceKey("");
      setSelectedServiceId("");
    }
    if (step === "experience") {
      setSelectedExperienceKey("");
      setSelectedServiceId("");
    }
    if (step === "duration") {
      setSelectedServiceId("");
    }
    setSelectionStep(step);
  }

  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">
          Prenotazioni
        </p>
        <h1 className="mt-3 text-4xl font-heading font-bold">Nessuna esperienza attiva</h1>
        <p className="mt-4 text-white/75">
          Al momento non ci sono servizi prenotabili online.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-24 lg:px-8">
      <div className="mx-auto max-w-3xl text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">
          Prenotazioni
        </p>
        <h1 className="mt-3 text-4xl font-heading font-bold md:text-6xl">
          Prenota escursioni in barca alle Isole Egadi online
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 md:text-lg">
          Scegli mezzo, esperienza, durata e data disponibile con prezzo aggiornato.
          Il checkout crea una prenotazione diretta sul calendario centrale Egadisailing.
        </p>
      </div>

      <StepProgress currentStep={selectionStep} hasDurationStep={needsDurationStep} />

      <section className="mt-8" aria-labelledby="booking-wizard-title">
        {selectionStep === "boat" && (
          <SelectionCard
            stepLabel="Step 1"
            title="Scegli il mezzo"
            subtitle="Ogni mezzo mostra solo le esperienze realmente collegate nel database."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {boats.map((boat) => (
                <button
                  key={boat.id}
                  type="button"
                  onClick={() => chooseBoat(boat.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition",
                    selectedBoatId === boat.id
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50",
                  )}
                  aria-pressed={selectedBoatId === boat.id}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-base font-bold text-slate-950">
                        {boat.title}
                      </span>
                      <span className="mt-1 block text-sm text-slate-600">
                        {boat.serviceCount} opzioni prenotabili
                      </span>
                    </span>
                    {selectedBoatId === boat.id && (
                      <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <SelectionActions
              canContinue={Boolean(selectedBoatId)}
              onContinue={() => setSelectionStep("experience")}
            />
          </SelectionCard>
        )}

        {selectionStep === "experience" && (
          <SelectionCard
            stepLabel="Step 2"
            title="Scegli l'esperienza"
            subtitle={`Esperienze disponibili per ${selectedBoatTitle || "il mezzo selezionato"}.`}
            onBack={() => resetToStep("boat")}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {experienceOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => chooseExperience(option)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition",
                    selectedExperienceKey === option.key
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50",
                  )}
                  aria-pressed={selectedExperienceKey === option.key}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-base font-bold text-slate-950">
                        {option.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-sm text-slate-600">
                        {option.subtitle}
                      </span>
                    </span>
                    {selectedExperienceKey === option.key && (
                      <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
                    )}
                  </span>
                  {nextStepAfterExperience(option.services) === "duration" && (
                    <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Durata da scegliere
                    </span>
                  )}
                </button>
              ))}
            </div>
            <SelectionActions
              canContinue={Boolean(selectedExperience)}
              onContinue={continueFromExperience}
            />
          </SelectionCard>
        )}

        {selectionStep === "duration" && selectedExperience && (
          <SelectionCard
            stepLabel="Step 3"
            title="Scegli per quanto tempo"
            subtitle="La durata determina il servizio reale usato da prezzi, disponibilita' e checkout."
            onBack={() => resetToStep("experience")}
          >
            {selectedExperience.services[0]?.serviceType === "CABIN_CHARTER" ? (
              <div className="grid gap-3 sm:grid-cols-5">
                {CHARTER_DURATION_DAYS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      setSelectedCharterDays(days);
                      setSelectedServiceId(selectedExperience.services[0].id);
                    }}
                    className={cn(
                      "rounded-lg border p-4 text-center transition",
                      selectedCharterDays === days
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50",
                    )}
                    aria-pressed={selectedCharterDays === days}
                  >
                    <span className="block text-lg font-bold text-slate-950">{days}</span>
                    <span className="text-sm text-slate-600">giornate</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {selectedExperience.services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(service.id)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      selectedServiceId === service.id
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50",
                    )}
                    aria-pressed={selectedServiceId === service.id}
                  >
                    <span className="block text-base font-bold text-slate-950">
                      {durationOptionLabel(service)}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {durationDetail(service)}
                    </span>
                    <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {service.priceLabel} {service.priceUnitLabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <SelectionActions
              canContinue={Boolean(selectedServiceId)}
              onContinue={() => setSelectionStep("booking")}
            />
          </SelectionCard>
        )}

        {selectionStep === "booking" && selectedService && (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-white/15 bg-white/10 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">
                  Percorso selezionato
                </p>
                <p className="mt-1 text-xl font-bold">
                  {selectedBoatTitle} · {experienceTitle(selectedService)}
                </p>
                <p className="mt-1 text-sm text-white/75">{selectedDurationLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => resetToStep("boat")}
                className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Cambia selezione
              </button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <InfoTile icon={Clock3} label="Durata" value={selectedDurationLabel} />
              <InfoTile
                icon={Users}
                label="Capacita'"
                value={`Fino a ${selectedService.capacityMax} persone`}
              />
              <InfoTile icon={CreditCard} label="Checkout" value={paymentLabel(selectedService)} />
            </div>

            <h2 id="booking-wizard-title" className="sr-only">
              Wizard prenotazione {selectedService.title}
            </h2>
            <BookingWizard
              key={[
                selectedService.id,
                fixedDurationDays ?? "open",
                initialStartDate ?? "no-date",
                initialEndDate ?? "no-end",
                initialDurationDays ?? "no-days",
              ].join(":")}
              locale={locale}
              serviceId={selectedService.id}
              serviceName={selectedService.title}
              serviceType={selectedService.serviceType}
              durationType={selectedService.durationType}
              durationHours={selectedService.durationHours}
              capacityMax={selectedService.capacityMax}
              defaultPaymentSchedule={selectedService.defaultPaymentSchedule}
              defaultDepositPercentage={selectedService.defaultDepositPercentage}
              turnstileSiteKey={turnstileSiteKey}
              appUrl={appUrl}
              initialStartDate={initialStartDate}
              initialEndDate={initialEndDate}
              initialDurationDays={fixedDurationDays ?? initialDurationDays}
              fixedDurationDays={fixedDurationDays}
            />
          </>
        )}
      </section>
    </div>
  );
}

function StepProgress({
  currentStep,
  hasDurationStep,
}: {
  currentStep: SelectionStep;
  hasDurationStep: boolean;
}) {
  const steps = [
    { key: "boat", label: "Mezzo" },
    { key: "experience", label: "Esperienza" },
    { key: "duration", label: "Durata" },
    { key: "booking", label: "Data e checkout" },
  ] as const;
  const currentIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <div className="mx-auto mt-8 grid max-w-3xl grid-cols-4 gap-1 rounded-full bg-white/10 p-1 text-xs font-semibold text-white/70">
      {steps.map((step, index) => {
        const skipped = step.key === "duration" && !hasDurationStep && currentStep === "booking";
        const active = step.key === currentStep;
        const complete = index < currentIndex && !skipped;
        return (
          <div
            key={step.key}
            className={cn(
              "rounded-full px-2 py-2 text-center",
              active && "bg-white text-slate-950",
              complete && "bg-white/80 text-slate-800",
            )}
          >
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

function SelectionCard({
  stepLabel,
  title,
  subtitle,
  onBack,
  children,
}: {
  stepLabel: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              {stepLabel}
            </p>
            <h2
              id="booking-wizard-title"
              className="mt-1 text-2xl font-heading font-bold text-slate-950"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              Indietro
            </button>
          )}
        </div>
      </div>
      <div className="p-5 sm:p-8">{children}</div>
    </div>
  );
}

function SelectionActions({
  canContinue,
  onContinue,
}: {
  canContinue: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d97706] px-5 py-3 font-bold text-white disabled:opacity-50"
      >
        Continua
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-4 text-white">
      <Icon className="mb-3 size-5 text-sky-100" aria-hidden="true" />
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-100">
        {label}
      </p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
