// @ts-nocheck - legacy schema references, refactored in Plan 5
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateBookingStatus } from "../../../_actions/booking-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      trip: {
        include: {
          service: { select: { name: true } },
        },
      },
    },
  });

  if (!booking) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Prenotazione
          </h1>
          <p className="text-sm text-muted-foreground">
            ID: {booking.id}
          </p>
        </div>
        <Badge variant={statusVariant[booking.status] ?? "default"}>
          {booking.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Nome: </span>
              {booking.customer.name}
            </div>
            <div>
              <span className="text-muted-foreground">Email: </span>
              {booking.customer.email}
            </div>
            {booking.customer.phone && (
              <div>
                <span className="text-muted-foreground">Telefono: </span>
                {booking.customer.phone}
              </div>
            )}
            {booking.customer.nationality && (
              <div>
                <span className="text-muted-foreground">Nazionalità: </span>
                {booking.customer.nationality}
              </div>
            )}
            <div className="pt-2">
              <Link
                href={`/admin/customers/${booking.customer.id}`}
                className="text-sm font-medium underline underline-offset-4 hover:text-primary"
              >
                Vedi profilo cliente
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Dettagli */}
        <Card>
          <CardHeader>
            <CardTitle>Dettagli</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Servizio: </span>
              {booking.trip.service.name}
            </div>
            <div>
              <span className="text-muted-foreground">Data: </span>
              {booking.trip.date.toLocaleDateString("it-IT")}
            </div>
            <div>
              <span className="text-muted-foreground">Orario: </span>
              {booking.trip.departureTime} - {booking.trip.returnTime}
            </div>
            <div>
              <span className="text-muted-foreground">Persone: </span>
              {booking.numPeople}
            </div>
            <div>
              <span className="text-muted-foreground">Totale: </span>
              {booking.totalPrice.toNumber().toFixed(2)} €
            </div>
            <div>
              <span className="text-muted-foreground">Canale: </span>
              <Badge variant="outline">
                {channelLabels[booking.channel] ?? booking.channel}
              </Badge>
            </div>
            {booking.cabinNumber && (
              <div>
                <span className="text-muted-foreground">Cabina: </span>
                {booking.cabinNumber}
              </div>
            )}
            {booking.notes && (
              <div>
                <span className="text-muted-foreground">Note: </span>
                {booking.notes}
              </div>
            )}
            {booking.stripePaymentId && (
              <div>
                <span className="text-muted-foreground">Stripe ID: </span>
                <code className="text-xs">{booking.stripePaymentId}</code>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Azioni */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {booking.status === "PENDING" && (
              <form
                action={async () => {
                  "use server";
                  await updateBookingStatus(booking.id, "CONFIRMED");
                }}
                className="inline"
              >
                <Button type="submit" size="sm">
                  Conferma
                </Button>
              </form>
            )}
            {booking.status !== "CANCELLED" && (
              <form
                action={async () => {
                  "use server";
                  await updateBookingStatus(booking.id, "CANCELLED");
                }}
                className="inline"
              >
                <Button variant="destructive" type="submit" size="sm">
                  Annulla
                </Button>
              </form>
            )}
            {booking.status === "CONFIRMED" && (
              <form
                action={async () => {
                  "use server";
                  await updateBookingStatus(booking.id, "REFUNDED");
                }}
                className="inline"
              >
                <Button variant="outline" type="submit" size="sm">
                  Rimborsa
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
