"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getExperienceTitle, getServiceDurationLabel } from "@/lib/services/display";
import { cn } from "@/lib/utils";

export interface BookingSearchService {
  id: string;
  name: string;
  type: string;
  boatId: string;
  boatName: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  pricingUnit?: string | null;
}

interface BookingSearchProps {
  services: BookingSearchService[];
}

const BOAT_SERVICE_TYPES = new Set(["BOAT_SHARED", "BOAT_EXCLUSIVE"]);
const BOAT_TYPE_ORDER = ["BOAT_EXCLUSIVE", "BOAT_SHARED"];
const DURATION_ORDER: Record<string, number> = {
  FULL_DAY: 0,
  HALF_DAY_MORNING: 1,
  HALF_DAY_AFTERNOON: 2,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addIsoDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inclusiveDaysBetween(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

function isBoatService(service: BookingSearchService) {
  return BOAT_SERVICE_TYPES.has(service.type);
}

function isCharterService(service: BookingSearchService) {
  return service.type === "CABIN_CHARTER";
}

function bookingExperienceKey(service: BookingSearchService) {
  if (service.type === "BOAT_SHARED" || service.type === "BOAT_EXCLUSIVE") {
    return `${service.boatId}:${service.type}`;
  }
  return `${service.boatId}:${service.id}`;
}

function durationLabel(service: BookingSearchService, t: ReturnType<typeof useTranslations>) {
  if (service.durationType === "FULL_DAY") return t("durationFullDay");
  if (service.durationType === "HALF_DAY_MORNING") return t("durationMorning");
  if (service.durationType === "HALF_DAY_AFTERNOON") return t("durationAfternoon");
  return getServiceDurationLabel(service);
}

export function BookingSearch({ services }: BookingSearchProps) {
  const t = useTranslations("hero");
  const locale = useLocale();
  const router = useRouter();
  const [boatId, setBoatId] = useState("");
  const [boatExperienceType, setBoatExperienceType] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [charterEndDate, setCharterEndDate] = useState("");
  const minDate = useMemo(() => todayIso(), []);

  const boats = useMemo(() => {
    const map = new Map<string, { id: string; name: string; serviceCount: number }>();
    for (const service of services) {
      const existing = map.get(service.boatId);
      map.set(service.boatId, {
        id: service.boatId,
        name: service.boatName,
        serviceCount: (existing?.serviceCount ?? 0) + 1,
      });
    }
    return Array.from(map.values());
  }, [services]);

  const availableServices = useMemo(
    () => services.filter((service) => service.boatId === boatId),
    [boatId, services],
  );

  const isBoatFlow = availableServices.some(isBoatService);

  const boatExperienceOptions = useMemo(() => {
    const types = new Set(availableServices.filter(isBoatService).map((service) => service.type));
    return BOAT_TYPE_ORDER.filter((type) => types.has(type));
  }, [availableServices]);

  const boatDurationServices = useMemo(
    () =>
      availableServices
        .filter((service) => service.type === boatExperienceType)
        .sort(
          (a, b) =>
            (DURATION_ORDER[a.durationType] ?? 99) - (DURATION_ORDER[b.durationType] ?? 99),
        ),
    [availableServices, boatExperienceType],
  );

  const nonBoatServices = useMemo(() => {
    const options = availableServices.filter((service) => !isBoatService(service));
    const charterServices = options.filter(isCharterService);
    if (charterServices.length <= 1) return options;

    const canonicalCharter =
      charterServices.find((service) => service.id === "cabin-charter") ?? charterServices[0];

    return [
      ...options.filter((service) => !isCharterService(service)),
      canonicalCharter,
    ].sort((a, b) => (isCharterService(b) ? 1 : 0) - (isCharterService(a) ? 1 : 0));
  }, [availableServices]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );
  const showBoatDuration = isBoatFlow && Boolean(boatExperienceType);
  const selectedIsCharter = selectedService?.type === "CABIN_CHARTER";
  const showDateField = Boolean(serviceId);
  const charterDurationDays = selectedIsCharter
    ? inclusiveDaysBetween(date, charterEndDate)
    : null;
  const charterEndMinDate = date ? addIsoDays(date, 2) : minDate;
  const charterIsTooShort =
    selectedIsCharter &&
    Boolean(date && charterEndDate) &&
    (charterDurationDays === null || charterDurationDays < 3);
  const charterIsTooLong =
    selectedIsCharter && charterDurationDays !== null && charterDurationDays > 7;
  const charterIsBookable =
    selectedIsCharter &&
    charterDurationDays !== null &&
    charterDurationDays >= 3 &&
    charterDurationDays <= 7;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceId) {
      router.push(`/${locale}/experiences`);
      return;
    }
    const params = new URLSearchParams();
    if (selectedIsCharter) {
      if (!date || !charterEndDate || !charterIsBookable || !charterDurationDays) return;
      params.set("date", date);
      params.set("endDate", charterEndDate);
      params.set("durationDays", String(charterDurationDays));
    } else if (date) {
      params.set("date", date);
    }
    if (selectedService) {
      params.set("boat", selectedService.boatId);
      params.set("experience", bookingExperienceKey(selectedService));
      params.set("durationType", selectedService.durationType);
    }
    params.set("service", serviceId);
    router.push(`/${locale}/prenota?${params.toString()}`);
  }

  const canSubmit = Boolean(serviceId) && (selectedIsCharter ? charterIsBookable : Boolean(date));

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-3xl rounded-2xl bg-white p-3 shadow-2xl sm:rounded-[28px]"
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-2 md:items-stretch",
          (showBoatDuration || selectedIsCharter) && showDateField
            ? "md:grid-cols-[1fr_1.15fr_1fr_1fr_auto]"
            : showBoatDuration || showDateField
              ? "md:grid-cols-[1fr_1.2fr_1fr_auto]"
              : "md:grid-cols-[1fr_1.2fr_auto]",
        )}
      >
        {/* Vehicle field */}
        <motion.label layout className="rounded-xl border border-gray-200 px-3 py-4 text-left">
          <span className="sr-only">{t("vehicleLabel")}</span>
          <select
            value={boatId}
            onChange={(event) => {
              setBoatId(event.target.value);
              setBoatExperienceType("");
              setServiceId("");
              setDate("");
              setCharterEndDate("");
            }}
            className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none"
            aria-label={t("vehicleLabel")}
            required
          >
            <option value="">{t("vehiclePlaceholder")}</option>
            {boats.map((boat) => (
              <option key={boat.id} value={boat.id}>
                {boat.name}
              </option>
            ))}
          </select>
        </motion.label>

        {/* Experience field */}
        <motion.label
          layout
          className={cn(
            "rounded-xl border border-gray-200 px-3 py-4 text-left",
            !boatId && "opacity-60",
          )}
        >
          <span className="sr-only">{t("experienceLabel")}</span>
          {isBoatFlow ? (
            <select
              value={boatExperienceType}
              onChange={(event) => {
                setBoatExperienceType(event.target.value);
                setServiceId("");
                setDate("");
                setCharterEndDate("");
              }}
              disabled={!boatId}
              className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none disabled:cursor-not-allowed"
              aria-label={t("experienceLabel")}
              required
            >
              <option value="">{t("experiencePlaceholder")}</option>
              {boatExperienceOptions.map((type) => (
                <option key={type} value={type}>
                  {type === "BOAT_EXCLUSIVE"
                    ? t("boatExperienceExclusive")
                    : t("boatExperienceShared")}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={serviceId}
              onChange={(event) => {
                setServiceId(event.target.value);
                setDate("");
                setCharterEndDate("");
              }}
              disabled={!boatId}
              className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none disabled:cursor-not-allowed"
              aria-label={t("experienceLabel")}
              required
            >
              <option value="">{t("experiencePlaceholder")}</option>
              {nonBoatServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {getExperienceTitle(service, locale)}
                </option>
              ))}
            </select>
          )}
        </motion.label>

        <AnimatePresence mode="popLayout">
          {showBoatDuration && (
            <motion.label
              key="boat-duration"
              layout
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-4 text-left ring-1 ring-sky-100"
            >
              <span className="sr-only">{t("durationLabel")}</span>
              <select
                value={serviceId}
                onChange={(event) => {
                  setServiceId(event.target.value);
                  setDate("");
                  setCharterEndDate("");
                }}
                className="w-full bg-transparent text-sm font-medium text-sky-950 outline-none"
                aria-label={t("durationLabel")}
                required
              >
                <option value="">{t("durationPlaceholder")}</option>
                {boatDurationServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {durationLabel(service, t)}
                  </option>
                ))}
              </select>
            </motion.label>
          )}
        </AnimatePresence>

        {/* Date field */}
        <AnimatePresence mode="popLayout">
          {showDateField && selectedIsCharter && (
            <>
              <motion.div
                key="charter-start-date"
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex items-center gap-2"
              >
                <span className="w-5 shrink-0 text-right text-[11px] font-semibold uppercase text-gray-400">
                  {t("charterStartLabel")}
                </span>
                <label className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-4 text-left transition">
                  <span className="sr-only">{t("charterStartLabel")}</span>
                  <input
                    type="date"
                    min={minDate}
                    value={date}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      setDate(nextDate);
                      if (charterEndDate && nextDate && charterEndDate < addIsoDays(nextDate, 2)) {
                        setCharterEndDate("");
                      }
                    }}
                    className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none"
                    aria-label={t("charterStartLabel")}
                    required
                  />
                </label>
              </motion.div>
              <motion.div
                key="charter-end-date"
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex items-center gap-2"
              >
                <span className="w-5 shrink-0 text-right text-[11px] font-semibold uppercase text-gray-400">
                  {t("charterEndLabel")}
                </span>
                <label className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-4 text-left transition">
                  <span className="sr-only">{t("charterEndLabel")}</span>
                  <input
                    type="date"
                    min={charterEndMinDate}
                    value={charterEndDate}
                    onChange={(event) => setCharterEndDate(event.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none"
                    aria-label={t("charterEndLabel")}
                    required
                  />
                </label>
              </motion.div>
            </>
          )}
          {showDateField && !selectedIsCharter && (
            <motion.label
              key="date"
              layout
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-xl border border-gray-200 px-3 py-4 text-left transition"
            >
              <span className="sr-only">{t("dateLabel")}</span>
              <input
                type="date"
                min={minDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none"
                aria-label={t("dateLabel")}
                required
              />
            </motion.label>
          )}
        </AnimatePresence>

        {/* Search button */}
        <motion.button
          layout
          type="submit"
          disabled={!canSubmit}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0ea5e9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0284c7] disabled:cursor-not-allowed disabled:opacity-50 md:h-full md:w-16 md:px-0"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
          <span className="md:sr-only">Cerca</span>
        </motion.button>
      </div>
      {charterIsTooShort && (
        <p className="mt-2 px-1 text-xs font-medium text-amber-700">{t("charterTooShort")}</p>
      )}
      {charterIsTooLong && (
        <p className="mt-2 px-1 text-xs font-medium text-sky-800">{t("charterTooLong")}</p>
      )}
    </form>
  );
}
