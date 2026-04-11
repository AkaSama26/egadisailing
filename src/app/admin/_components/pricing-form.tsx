"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createPricingPeriod } from "../_actions/pricing-actions";
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

interface PricingFormProps {
  services: { id: string; name: string }[];
}

export function PricingForm({ services }: PricingFormProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    try {
      await createPricingPeriod(formData);
      toast.success("Periodo di prezzo creato con successo");
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
            Nuovo Periodo
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo Periodo di Prezzo</DialogTitle>
        </DialogHeader>
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
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Periodo</Label>
            <Input
              id="label"
              name="label"
              placeholder="es. bassa, media, alta, ferragosto"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data inizio</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data fine</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerPerson">Prezzo per persona (€)</Label>
              <Input
                id="pricePerPerson"
                name="pricePerPerson"
                type="number"
                step="0.01"
                min={0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Anno</Label>
              <Input
                id="year"
                name="year"
                type="number"
                defaultValue={new Date().getFullYear()}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto">
              Crea Periodo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
