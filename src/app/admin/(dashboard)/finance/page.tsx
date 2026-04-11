import { db } from "@/lib/db";
import { BookingStatus } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, BookOpen, Calculator } from "lucide-react";
import { StatsCard } from "../../_components/stats-card";
import { FinanceFilters } from "../../_components/finance-filters";
import { FinanceCharts } from "../../_components/finance-charts";
import { Suspense } from "react";

const channelCommissions: Record<string, number> = {
  WEBSITE: 0,
  MANUAL: 0,
  GET_YOUR_GUIDE: 0.25,
  AIRBNB: 0.2,
  CLICK_AND_BOAT: 0.18,
  VIATOR: 0.25,
  MUSEMENT: 0.2,
  SAMBOAT: 0.15,
};

function fmt(n: number) {
  return n.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  const now = new Date();
  const fromDate = params.from
    ? new Date(params.from)
    : new Date(now.getFullYear(), 0, 1);
  const toDate = params.to ? new Date(params.to) : now;
  // Set toDate to end of day
  toDate.setHours(23, 59, 59, 999);

  const bookings = await db.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      trip: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    },
    include: {
      trip: {
        include: {
          service: { select: { name: true } },
        },
      },
    },
  });

  // Aggregations
  let totalRevenue = 0;
  let totalCommissions = 0;

  const serviceMap = new Map<
    string,
    { count: number; revenue: number }
  >();
  const channelMap = new Map<
    string,
    { count: number; revenue: number; commission: number }
  >();
  const dailyMap = new Map<string, number>();

  for (const booking of bookings) {
    const price = booking.totalPrice.toNumber();
    const channel = booking.channel;
    const commissionRate = channelCommissions[channel] ?? 0;
    const commission = price * commissionRate;
    const serviceName = booking.trip.service.name;
    const dateKey = booking.trip.date.toISOString().slice(0, 10);

    totalRevenue += price;
    totalCommissions += commission;

    // Service breakdown
    const svc = serviceMap.get(serviceName) ?? { count: 0, revenue: 0 };
    svc.count += 1;
    svc.revenue += price;
    serviceMap.set(serviceName, svc);

    // Channel breakdown
    const ch = channelMap.get(channel) ?? {
      count: 0,
      revenue: 0,
      commission: 0,
    };
    ch.count += 1;
    ch.revenue += price;
    ch.commission += commission;
    channelMap.set(channel, ch);

    // Daily revenue
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + price);
  }

  const avgPrice =
    bookings.length > 0 ? totalRevenue / bookings.length : 0;

  const serviceData = Array.from(serviceMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  const channelData = Array.from(channelMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  const dailyData = Array.from(dailyMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const chartServiceData = serviceData.map(({ name, revenue }) => ({
    name,
    revenue,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Dashboard Finanziaria
      </h1>

      <Suspense fallback={null}>
        <FinanceFilters />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Guadagno Totale"
          value={`€ ${fmt(totalRevenue)}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Commissioni Stimate"
          value={`€ ${fmt(totalCommissions)}`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Prenotazioni"
          value={bookings.length}
          icon={BookOpen}
        />
        <StatsCard
          title="Prezzo Medio"
          value={`€ ${fmt(avgPrice)}`}
          icon={Calculator}
        />
      </div>

      <FinanceCharts dailyData={dailyData} serviceData={chartServiceData} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Per Servizio</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna prenotazione nel periodo selezionato
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servizio</TableHead>
                    <TableHead className="text-right">
                      N. prenotazioni
                    </TableHead>
                    <TableHead className="text-right">Guadagno (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceData.map((svc) => (
                    <TableRow key={svc.name}>
                      <TableCell>{svc.name}</TableCell>
                      <TableCell className="text-right">{svc.count}</TableCell>
                      <TableCell className="text-right">
                        {fmt(svc.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per Canale</CardTitle>
          </CardHeader>
          <CardContent>
            {channelData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna prenotazione nel periodo selezionato
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canale</TableHead>
                    <TableHead className="text-right">
                      N. prenotazioni
                    </TableHead>
                    <TableHead className="text-right">Guadagno (€)</TableHead>
                    <TableHead className="text-right">
                      Commissione stimata (€)
                    </TableHead>
                    <TableHead className="text-right">Netto (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelData.map((ch) => (
                    <TableRow key={ch.name}>
                      <TableCell>{ch.name}</TableCell>
                      <TableCell className="text-right">{ch.count}</TableCell>
                      <TableCell className="text-right">
                        {fmt(ch.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(ch.commission)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(ch.revenue - ch.commission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
