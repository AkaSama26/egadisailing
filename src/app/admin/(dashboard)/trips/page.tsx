import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { updateTripStatus } from "../../_actions/trip-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function TripsPage() {
  const trips = await db.trip.findMany({
    orderBy: { date: "desc" },
    include: {
      service: { select: { name: true, capacityMax: true } },
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Uscite</h1>
        <Link href="/admin/trips/new" className={buttonVariants()}>
          <Plus className="mr-2 size-4" />
          Nuova Uscita
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna uscita programmata
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Servizio</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Orario</TableHead>
              <TableHead>Posti</TableHead>
              <TableHead>Prenotazioni</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((trip) => (
              <TableRow key={trip.id}>
                <TableCell>{trip.service.name}</TableCell>
                <TableCell>
                  {trip.date.toLocaleDateString("it-IT")}
                </TableCell>
                <TableCell>
                  {trip.departureTime} - {trip.returnTime}
                </TableCell>
                <TableCell>
                  {trip.availableSpots}/{trip.service.capacityMax}
                </TableCell>
                <TableCell>{trip._count.bookings}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[trip.status] ?? "default"}>
                    {trip.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {trip.status === "SCHEDULED" && (
                    <div className="flex gap-2">
                      <form
                        action={async () => {
                          "use server";
                          await updateTripStatus(trip.id, "COMPLETED");
                        }}
                        className="inline"
                      >
                        <Button variant="outline" size="sm" type="submit">
                          Completa
                        </Button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await updateTripStatus(trip.id, "CANCELLED");
                        }}
                        className="inline"
                      >
                        <Button variant="destructive" size="sm" type="submit">
                          Annulla
                        </Button>
                      </form>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
