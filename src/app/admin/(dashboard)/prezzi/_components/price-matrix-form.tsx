"use client";

import { useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";
import { savePassengerFareRules, saveSeasons, saveServicePriceMatrix } from "../actions";
import { AdminCard } from "@/components/admin/admin-card";
import {
  PASSENGER_FARE_SERVICE_TYPE,
  normalizePassengerFareRules,
  type PassengerFareRuleConfig,
  type PassengerFarePricingMode,
} from "@/lib/pricing/passenger-fare-rules-shared";

type PriceBucket = "LOW" | "MID" | "HIGH";
type SeasonKey = PriceBucket | "LATE_LOW";

const SEASON_COLUMNS: Array<{ key: SeasonKey; label: string; bucket: PriceBucket; readOnly?: boolean }> = [
  { key: "LOW", label: "Bassa", bucket: "LOW" },
  { key: "MID", label: "Media", bucket: "MID" },
  { key: "HIGH", label: "Alta", bucket: "HIGH" },
  { key: "LATE_LOW", label: "Bassa tardiva", bucket: "LOW", readOnly: true },
];

const CHARTER_DURATIONS = [3, 4, 5, 6, 7] as const;

interface MatrixService {
  id: string;
  name: string;
  type: string;
  durationType: string;
  pricingUnit: string;
  boatName: string;
}

interface MatrixPrice {
  serviceId: string;
  priceBucket: string | null;
  durationDays: number | null;
  amount: string;
  pricingUnit: string;
}

interface MatrixSeason {
  key: SeasonKey;
  label: string;
  startDate: string;
  endDate: string;
  priceBucket: PriceBucket;
}

interface PriceMatrixFormProps {
  year: number;
  services: MatrixService[];
  prices: MatrixPrice[];
  seasons: MatrixSeason[];
  passengerFareRules: PassengerFareRuleConfig[];
}

function seasonalPriceKey(serviceId: string, bucket: string): string {
  return `${serviceId}:season:${bucket}`;
}

function charterPriceKey(serviceId: string, days: number, bucket: string): string {
  return `${serviceId}:charter:${days}:${bucket}`;
}

function legacyCharterPriceKey(serviceId: string, days: number): string {
  return `${serviceId}:charter:${days}:legacy`;
}

function amountToInput(amount?: string): string {
  return amount ? Number(amount).toFixed(2) : "";
}

function normalizeNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeNonNegativeNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function serviceDurationLabel(service: MatrixService): string {
  if (service.durationType === "FULL_DAY") return "8h";
  if (service.durationType === "HALF_DAY_MORNING") return "4h mattina";
  if (service.durationType === "HALF_DAY_AFTERNOON") return "4h pomeriggio";
  if (service.type === "CABIN_CHARTER") return "3-7 giorni";
  return service.durationType;
}

export function PriceMatrixForm({
  year,
  services,
  prices,
  seasons,
  passengerFareRules,
}: PriceMatrixFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [fareRules, setFareRules] = useState<PassengerFareRuleConfig[]>(() =>
    normalizePassengerFareRules(passengerFareRules),
  );
  const [priceValues, setPriceValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    for (const price of prices) {
      const key =
        price.durationDays != null && price.priceBucket != null
          ? charterPriceKey(price.serviceId, price.durationDays, price.priceBucket)
          : price.priceBucket != null
            ? seasonalPriceKey(price.serviceId, price.priceBucket)
            : price.durationDays != null
              ? legacyCharterPriceKey(price.serviceId, price.durationDays)
              : null;
      if (key) values[key] = amountToInput(price.amount);
    }
    return values;
  });
  const [seasonValues, setSeasonValues] = useState<Record<SeasonKey, MatrixSeason>>(() => {
    const fallback: Record<SeasonKey, MatrixSeason> = {
      LOW: {
        key: "LOW",
        label: "Bassa stagione",
        startDate: `${year}-04-01`,
        endDate: `${year}-06-15`,
        priceBucket: "LOW",
      },
      MID: {
        key: "MID",
        label: "Media stagione",
        startDate: `${year}-06-16`,
        endDate: `${year}-07-15`,
        priceBucket: "MID",
      },
      HIGH: {
        key: "HIGH",
        label: "Alta stagione",
        startDate: `${year}-07-16`,
        endDate: `${year}-09-15`,
        priceBucket: "HIGH",
      },
      LATE_LOW: {
        key: "LATE_LOW",
        label: "Bassa tardiva",
        startDate: `${year}-09-16`,
        endDate: `${year}-10-31`,
        priceBucket: "LOW",
      },
    };
    for (const season of seasons) fallback[season.key] = season;
    return fallback;
  });

  const seasonalServices = useMemo(
    () => services.filter((service) => service.type !== "CABIN_CHARTER"),
    [services],
  );
  const charterService = services.find((service) => service.type === "CABIN_CHARTER");

  function updatePrice(key: string, value: string) {
    setPriceValues((current) => ({ ...current, [key]: value }));
  }

  function updateSeason(key: SeasonKey, patch: Partial<MatrixSeason>) {
    setSeasonValues((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
        priceBucket: key === "LATE_LOW" ? "LOW" : patch.priceBucket ?? current[key].priceBucket,
      },
    }));
  }

  function updateFareRule(
    category: PassengerFareRuleConfig["category"],
    patch: Partial<PassengerFareRuleConfig>,
  ) {
    setFareRules((current) =>
      current.map((rule) => {
        if (rule.category !== category) return rule;
        if (rule.category === "ADULT") {
          return {
            ...rule,
            ...patch,
            pricingMode: "MULTIPLIER" as const,
            multiplier: 1,
            fixedAmount: null,
            occupiesSeat: true,
            active: true,
          };
        }
        return { ...rule, ...patch };
      }),
    );
  }

  function submitPrices() {
    setMessage(null);
    const rows: Array<{
      serviceId: string;
      priceBucket?: PriceBucket | null;
      durationDays?: number | null;
      amount: number;
      pricingUnit: "PER_PERSON" | "PER_PACKAGE";
    }> = [];

    for (const service of seasonalServices) {
      for (const column of SEASON_COLUMNS.filter((c) => !c.readOnly)) {
        const amount = normalizeNumber(priceValues[seasonalPriceKey(service.id, column.bucket)] ?? "");
        if (!amount) {
          setMessage(`Inserisci un prezzo valido per ${service.name} (${column.label})`);
          return;
        }
        rows.push({
          serviceId: service.id,
          priceBucket: column.bucket,
          durationDays: null,
          amount,
          pricingUnit: service.pricingUnit === "PER_PACKAGE" ? "PER_PACKAGE" : "PER_PERSON",
        });
      }
    }

    if (charterService) {
      for (const days of CHARTER_DURATIONS) {
        for (const column of SEASON_COLUMNS.filter((c) => !c.readOnly)) {
          const amount = normalizeNumber(
            priceValues[charterPriceKey(charterService.id, days, column.bucket)] ??
              priceValues[legacyCharterPriceKey(charterService.id, days)] ??
              "",
          );
          if (!amount) {
            setMessage(`Inserisci un prezzo charter valido per ${days} giornate (${column.label})`);
            return;
          }
          rows.push({
            serviceId: charterService.id,
            priceBucket: column.bucket,
            durationDays: days,
            amount,
            pricingUnit: "PER_PACKAGE",
          });
        }
      }
    }

    startTransition(async () => {
      const result = await saveServicePriceMatrix({ year, rows });
      setMessage(result.ok ? "Listino salvato." : result.message);
    });
  }

  function submitSeasons() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveSeasons({
        year,
        seasons: SEASON_COLUMNS.map((column) => ({
          key: column.key,
          label: seasonValues[column.key].label,
          startDate: seasonValues[column.key].startDate,
          endDate: seasonValues[column.key].endDate,
          priceBucket: column.key === "LATE_LOW" ? "LOW" : column.bucket,
        })),
      });
      setMessage(result.ok ? "Stagioni salvate." : result.message);
    });
  }

  function submitPassengerFareRules() {
    setMessage(null);

    const rows = normalizePassengerFareRules(fareRules).map((rule) => {
      const multiplier =
        rule.pricingMode === "MULTIPLIER" ? normalizeNonNegativeNumber(String(rule.multiplier)) : 0;
      const fixedAmount =
        rule.pricingMode === "FIXED" ? normalizeNonNegativeNumber(String(rule.fixedAmount ?? 0)) : null;

      if (rule.pricingMode === "MULTIPLIER" && multiplier == null) {
        setMessage(`Inserisci una percentuale valida per ${rule.label}`);
        return null;
      }
      if (rule.pricingMode === "FIXED" && fixedAmount == null) {
        setMessage(`Inserisci un prezzo fisso valido per ${rule.label}`);
        return null;
      }

      return {
        category: rule.category,
        label: rule.label,
        ageLabel: rule.ageLabel,
        pricingMode: rule.pricingMode,
        multiplier,
        fixedAmount,
        occupiesSeat: rule.occupiesSeat,
        active: rule.active,
        sortOrder: rule.sortOrder,
      };
    });

    if (rows.some((row) => row == null)) return;

    startTransition(async () => {
      const result = await savePassengerFareRules({
        serviceType: PASSENGER_FARE_SERVICE_TYPE,
        rules: rows.filter((row): row is NonNullable<typeof row> => row != null),
      });
      setMessage(result.ok ? "Categorie passeggeri salvate." : result.message);
    });
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <AdminCard title="Stagioni annuali">
        <div className="grid gap-3 md:grid-cols-4">
          {SEASON_COLUMNS.map((column) => {
            const season = seasonValues[column.key];
            return (
              <div key={column.key} className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-900">{column.label}</div>
                <label className="mt-3 block text-xs font-medium text-slate-500">
                  Inizio
                  <input
                    type="date"
                    value={season.startDate}
                    onChange={(event) => updateSeason(column.key, { startDate: event.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  />
                </label>
                <label className="mt-2 block text-xs font-medium text-slate-500">
                  Fine
                  <input
                    type="date"
                    value={season.endDate}
                    onChange={(event) => updateSeason(column.key, { endDate: event.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  Bucket prezzo: <strong>{column.bucket}</strong>
                </p>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={submitSeasons}
          disabled={isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="size-4" />
          Salva stagioni
        </button>
      </AdminCard>

      <AdminCard title="Listino stagionale">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Servizio</th>
                {SEASON_COLUMNS.map((column) => (
                  <th key={column.key} className="px-3 py-2 text-right font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seasonalServices.map((service) => (
                <tr key={service.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">{service.name}</div>
                    <div className="text-xs text-slate-500">
                      {service.boatName} · {serviceDurationLabel(service)}
                    </div>
                  </td>
                  {SEASON_COLUMNS.map((column) => {
                    const key = seasonalPriceKey(service.id, column.bucket);
                    const value = priceValues[key] ?? "";
                    return (
                      <td key={column.key} className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min={1}
                          step="0.01"
                          value={value}
                          readOnly={column.readOnly}
                          onChange={(event) => updatePrice(key, event.target.value)}
                          className="w-28 rounded-md border border-slate-300 px-2 py-2 text-right font-mono text-sm read-only:bg-slate-100"
                          aria-label={`${service.name} ${column.label}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {charterService && (
        <AdminCard title="Charter 3-7 giornate · stagionale">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Durata</th>
                  {SEASON_COLUMNS.map((column) => (
                    <th key={column.key} className="px-3 py-2 text-right font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHARTER_DURATIONS.map((days) => (
                  <tr key={days} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-900">{days} giornate</td>
                    {SEASON_COLUMNS.map((column) => {
                      const key = charterPriceKey(charterService.id, days, column.bucket);
                      const legacyKey = legacyCharterPriceKey(charterService.id, days);
                      const value = priceValues[key] ?? priceValues[legacyKey] ?? "";
                      return (
                        <td key={column.key} className="px-3 py-3 text-right">
                          <input
                            type="number"
                            min={1}
                            step="0.01"
                            value={value}
                            readOnly={column.readOnly}
                            onChange={(event) => updatePrice(key, event.target.value)}
                            className="w-28 rounded-md border border-slate-300 px-2 py-2 text-right font-mono text-sm read-only:bg-slate-100"
                            aria-label={`Charter ${days} giornate ${column.label}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <AdminCard title="Categorie passeggeri · barca condivisa">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Categoria</th>
                <th className="px-3 py-2 text-left font-medium">Eta'</th>
                <th className="px-3 py-2 text-left font-medium">Prezzo</th>
                <th className="px-3 py-2 text-right font-medium">Valore</th>
                <th className="px-3 py-2 text-center font-medium">Posto</th>
                <th className="px-3 py-2 text-center font-medium">Attiva</th>
              </tr>
            </thead>
            <tbody>
              {fareRules.map((rule) => {
                const isAdult = rule.category === "ADULT";
                return (
                  <tr key={rule.category} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={rule.label}
                        onChange={(event) => updateFareRule(rule.category, { label: event.target.value })}
                        className="w-36 rounded-md border border-slate-300 px-2 py-2 text-sm"
                        aria-label={`Nome categoria ${rule.category}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={rule.ageLabel}
                        onChange={(event) => updateFareRule(rule.category, { ageLabel: event.target.value })}
                        className="w-28 rounded-md border border-slate-300 px-2 py-2 text-sm"
                        aria-label={`Eta' categoria ${rule.category}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={rule.pricingMode}
                        disabled={isAdult}
                        onChange={(event) =>
                          updateFareRule(rule.category, {
                            pricingMode: event.target.value as PassengerFarePricingMode,
                          })
                        }
                        className="w-36 rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-100"
                        aria-label={`Tipo prezzo ${rule.label}`}
                      >
                        <option value="MULTIPLIER">Percentuale</option>
                        <option value="FIXED">Prezzo fisso</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {rule.pricingMode === "MULTIPLIER" ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={Math.round(rule.multiplier * 100)}
                            disabled={isAdult}
                            onChange={(event) =>
                              updateFareRule(rule.category, {
                                multiplier: Math.max(0, Number(event.target.value) / 100),
                                fixedAmount: null,
                              })
                            }
                            className="w-24 rounded-md border border-slate-300 px-2 py-2 text-right font-mono text-sm disabled:bg-slate-100"
                            aria-label={`Percentuale ${rule.label}`}
                          />
                          <span className="text-slate-500">%</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={rule.fixedAmount ?? 0}
                            onChange={(event) =>
                              updateFareRule(rule.category, {
                                fixedAmount: Math.max(0, Number(event.target.value)),
                                multiplier: 0,
                              })
                            }
                            className="w-24 rounded-md border border-slate-300 px-2 py-2 text-right font-mono text-sm"
                            aria-label={`Prezzo fisso ${rule.label}`}
                          />
                          <span className="text-slate-500">€</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={rule.occupiesSeat}
                        disabled={isAdult}
                        onChange={(event) =>
                          updateFareRule(rule.category, { occupiesSeat: event.target.checked })
                        }
                        className="size-4 rounded border-slate-300"
                        aria-label={`Occupa posto ${rule.label}`}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={rule.active}
                        disabled={isAdult}
                        onChange={(event) =>
                          updateFareRule(rule.category, { active: event.target.checked })
                        }
                        className="size-4 rounded border-slate-300"
                        aria-label={`Categoria attiva ${rule.label}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={submitPassengerFareRules}
          disabled={isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="size-4" />
          Salva categorie
        </button>
      </AdminCard>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submitPrices}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="size-4" />
          Salva listino
        </button>
      </div>
    </div>
  );
}
