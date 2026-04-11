import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookingForm } from "../../_components/booking-form";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  REFUNDED: "outline",
};

const channelLabels: Record<string, string> = {
  WEBSITE: "Sito Web",
  GET_YOUR_GUIDE: "GetYourGuide",
  AIRBNB: "Airbnb",
  CLICK_AND_BOAT: "Click&Boat",
  MUSEMENT: "Musement",
  VIATOR: "Viator",
  SAMBOAT: "SamBoat",
  MANUAL: "Manuale",
};

export default async function BookingsPage() {
  const [bookings, availableTrips] = await Promise.all([
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, email: true } },
        trip: {
          select: {
            date: true,
            service: { select: { name: true } },
          },
        },
      },
    }),
    db.trip.findMany({
      where: { status: "SCHEDULED", availableSpots: { gt: 0 } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        availableSpots: true,
        service: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Prenotazioni</h1>
        <BookingForm trips={availableTrips} />
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna prenotazione presente
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Servizio</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Persone</TableHead>
              <TableHead>Totale</TableHead>
              <TableHead>Canale</TableHead>
              <TableHead>Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="font-medium underline underline-offset-4 hover:text-primary"
                  >
                    {booking.customer.name}
                  </Link>
                </TableCell>
                <TableCell>{booking.trip.service.name}</TableCell>
                <TableCell>
                  {booking.trip.date.toLocaleDateString("it-IT")}
                </TableCell>
                <TableCell>{booking.numPeople}</TableCell>
                <TableCell>
                  {booking.totalPrice.toNumber().toFixed(2)} €
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {channelLabels[booking.channel] ?? booking.channel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[booking.status] ?? "default"}>
                    {booking.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
