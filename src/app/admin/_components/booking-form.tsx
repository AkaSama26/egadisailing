"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createManualBooking } from "../_actions/booking-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface BookingFormProps {
  trips: {
    id: string;
    date: Date;
    availableSpots: number;
    service: { name: string };
  }[];
}

const channelOptions = [
  { value: "MANUAL", label: "Manuale" },
  { value: "WEBSITE", label: "Sito Web" },
  { value: "GET_YOUR_GUIDE", label: "GetYourGuide" },
  { value: "AIRBNB", label: "Airbnb" },
  { value: "CLICK_AND_BOAT", label: "Click&Boat" },
  { value: "VIATOR", label: "Viator" },
  { value: "MUSEMENT", label: "Musement" },
  { value: "SAMBOAT", label: "SamBoat" },
];

export function BookingForm({ trips }: BookingFormProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    try {
      await createManualBooking(formData);
      toast.success("Prenotazione creata con successo");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore nella creazione",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 size-4" />
            Nuova Prenotazione
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuova Prenotazione</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tripId">Uscita</Label>
            <Select name="tripId" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona un'uscita" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.service.name} —{" "}
                    {trip.date.toLocaleDateString("it-IT")} (
                    {trip.availableSpots} posti)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Nome cliente</Label>
            <Input
              id="customerName"
              name="customerName"
              placeholder="Mario Rossi"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email cliente</Label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              placeholder="mario@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Telefono (opzionale)</Label>
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              placeholder="+39 333 1234567"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numPeople">Persone</Label>
              <Input
                id="numPeople"
                name="numPeople"
                type="number"
                min={1}
                defaultValue={1}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalPrice">Totale (€)</Label>
              <Input
                id="totalPrice"
                name="totalPrice"
                type="number"
                step="0.01"
                min={0}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Canale</Label>
            <Select name="channel" defaultValue="MANUAL">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona canale" />
              </SelectTrigger>
              <SelectContent>
                {channelOptions.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Input
              id="notes"
              name="notes"
              placeholder="Note aggiuntive"
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto">
              Crea Prenotazione
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
