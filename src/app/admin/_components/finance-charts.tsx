"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface FinanceChartsProps {
  dailyData: { date: string; revenue: number }[];
  serviceData: { name: string; revenue: number }[];
}

const serviceChartConfig = {
  revenue: {
    label: "Guadagno (€)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const dailyChartConfig = {
  revenue: {
    label: "Guadagno (€)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function FinanceCharts({ dailyData, serviceData }: FinanceChartsProps) {
  if (dailyData.length === 0 && serviceData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Nessun dato disponibile per il periodo selezionato
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Guadagno per Servizio</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun dato</p>
          ) : (
            <ChartContainer config={serviceChartConfig}>
              <BarChart data={serviceData} accessibilityLayer>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) =>
                    value.length > 12 ? `${value.slice(0, 12)}...` : value
                  }
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guadagno nel Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun dato</p>
          ) : (
            <ChartContainer config={dailyChartConfig}>
              <LineChart data={dailyData} accessibilityLayer>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
