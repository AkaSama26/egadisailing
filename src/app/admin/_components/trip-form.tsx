"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTrip } from "../_actions/trip-actions";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TripFormProps {
  services: { id: string; name: string; type: string }[];
}

export function TripForm({ services }: TripFormProps) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    try {
      await createTrip(formData);
      toast.success("Uscita creata con successo");
      router.push("/admin/trips");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore nella creazione",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dettagli Uscita</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceId">Servizio</Label>
            <Select name="serviceId" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona un servizio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} ({service.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" name="date" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureTime">Orario partenza</Label>
              <Input
                id="departureTime"
                type="time"
                name="departureTime"
                defaultValue="09:00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnTime">Orario rientro</Label>
              <Input
                id="returnTime"
                type="time"
                name="returnTime"
                defaultValue="17:00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Input id="notes" name="notes" placeholder="Note opzionali" />
          </div>

          <Button type="submit" className="w-full">
            Crea Uscita
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
