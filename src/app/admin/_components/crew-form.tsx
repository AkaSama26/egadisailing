"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createCrewMember } from "../_actions/crew-actions";
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

const roleOptions = [
  { value: "SKIPPER", label: "Skipper" },
  { value: "CHEF", label: "Chef" },
  { value: "HOSTESS", label: "Hostess" },
];

export function CrewForm() {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    try {
      await createCrewMember(formData);
      toast.success("Membro crew creato con successo");
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
            Nuovo Membro
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo Membro Crew</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              placeholder="Nome e cognome"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Ruolo</Label>
            <Select name="role" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona un ruolo" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefono (opzionale)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+39 333 1234567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (opzionale)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nome@example.com"
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto">
              Crea Membro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
