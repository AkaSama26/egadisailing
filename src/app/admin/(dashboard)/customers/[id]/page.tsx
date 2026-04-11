import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateCustomer } from "../../../_actions/customer-actions";

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

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        include: {
          trip: {
            select: {
              date: true,
              service: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const updateCustomerWithId = updateCustomer.bind(null, customer.id);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Info Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCustomerWithId} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={customer.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={customer.email}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={customer.phone ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nazionalit&agrave;</Label>
                <Input
                  id="nationality"
                  name="nationality"
                  defaultValue={customer.nationality ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Lingua</Label>
                <Input
                  id="language"
                  name="language"
                  defaultValue={customer.language ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Input
                  id="notes"
                  name="notes"
                  defaultValue={customer.notes ?? ""}
                />
              </div>
            </div>
            <Button type="submit">Salva modifiche</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storico Prenotazioni</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna prenotazione per questo cliente
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servizio</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Persone</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Canale</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.trip.service.name}
                    </TableCell>
                    <TableCell>
                      {booking.trip.date.toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell>{booking.numPeople}</TableCell>
                    <TableCell>
                      {booking.totalPrice.toNumber().toFixed(2)} &euro;
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {channelLabels[booking.channel] ?? booking.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant[booking.status] ?? "default"}
                      >
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
