// @ts-nocheck - legacy schema references, refactored in Plan 5
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
import { Badge } from "@/components/ui/badge";
import { BookOpen, DollarSign, Users, CalendarDays } from "lucide-react";
import { StatsCard } from "../_components/stats-card";

const statusVariant: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  REFUNDED: "outline",
};

export default async function AdminDashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [todayBookings, monthRevenue, totalCustomers, scheduledTrips, recentBookings] =
    await Promise.all([
      // Count of today's bookings (CONFIRMED or PENDING)
      db.booking.count({
        where: {
          trip: {
            date: { gte: today, lt: tomorrow },
          },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        },
      }),

      // Sum of this month's confirmed booking revenue
      db.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: BookingStatus.CONFIRMED,
          trip: {
            date: { gte: monthStart, lt: monthEnd },
          },
        },
      }),

      // Total customer count
      db.customer.count(),

      // Count of scheduled trips in the future
      db.trip.count({
        where: {
          date: { gte: today },
          status: "SCHEDULED",
        },
      }),

      // Last 10 bookings with customer and trip/service info
      db.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, email: true } },
          trip: { select: { date: true, service: { select: { name: true } } } },
        },
      }),
    ]);

  const revenue = monthRevenue._sum.totalPrice
    ? monthRevenue._sum.totalPrice.toNumber()
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Prenotazioni Oggi"
          value={todayBookings}
          icon={BookOpen}
        />
        <StatsCard
          title="Guadagno Mese"
          value={`€ ${revenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Clienti Totali"
          value={totalCustomers}
          icon={Users}
        />
        <StatsCard
          title="Uscite Programmate"
          value={scheduledTrips}
          icon={CalendarDays}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultime Prenotazioni</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna prenotazione ancora
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servizio</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Persone</TableHead>
                  <TableHead>Totale (€)</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.customer.name}</TableCell>
                    <TableCell>{booking.trip.service.name}</TableCell>
                    <TableCell>
                      {booking.trip.date.toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell>{booking.numPeople}</TableCell>
                    <TableCell>
                      € {booking.totalPrice.toNumber().toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[booking.status]}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
