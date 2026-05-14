"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type CloudflareHourlyLineChartPoint = {
  hour: string;
  visits: number;
};

const chartConfig = {
  visits: {
    label: "Visite",
    color: "var(--color-turquoise)",
  },
} satisfies ChartConfig;

const numberFormatter = new Intl.NumberFormat("it-IT");
const hourFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});
const tooltipDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "Europe/Rome",
});

export function CloudflareHourlyLineChart({
  data,
}: {
  data: CloudflareHourlyLineChartPoint[];
}) {
  const chartData = React.useMemo(
    () =>
      data.map((point) => ({
        hour: point.hour,
        visits: point.visits,
      })),
    [data],
  );

  const totalVisits = React.useMemo(
    () => chartData.reduce((total, point) => total + point.visits, 0),
    [chartData],
  );
  const peakVisits = React.useMemo(
    () => chartData.reduce((peak, point) => Math.max(peak, point.visits), 0),
    [chartData],
  );

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Visite per ora</h3>
        <p className="mt-2 text-sm text-slate-500">Nessun dato disponibile.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Visite per ora</h3>
          <p className="mt-1 text-xs text-slate-500">Andamento ultime 24 ore · ora locale</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-44">
          <Metric label="Totale" value={totalVisits} />
          <Metric label="Picco" value={peakVisits} />
        </div>
      </div>

      <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[260px] w-full">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            bottom: 0,
            left: 4,
            right: 16,
            top: 8,
          }}
        >
          <CartesianGrid strokeDasharray="4 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="hour"
            minTickGap={28}
            tickFormatter={formatHourLabel}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickFormatter={(value) => formatNumber(Number(value))}
            tickLine={false}
            tickMargin={8}
            width={34}
          />
          <ChartTooltip
            cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                className="w-[170px]"
                labelFormatter={(value) => formatTooltipLabel(String(value))}
              />
            }
          />
          <Line
            activeDot={{ r: 4 }}
            dataKey="visits"
            dot={false}
            stroke="var(--color-visits)"
            strokeWidth={2.5}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="block text-slate-500">{label}</span>
      <span className="mt-1 block font-mono text-sm font-semibold tabular-nums text-slate-950">
        {formatNumber(value)}
      </span>
    </div>
  );
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatHourLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return hourFormatter.format(date);
}

function formatTooltipLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return tooltipDateFormatter.format(date);
}
