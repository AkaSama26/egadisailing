"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePricingPeriod } from "../_actions/pricing-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PricingTableProps {
  services: {
    id: string;
    name: string;
    pricingPeriods: {
      id: string;
      label: string;
      startDate: Date;
      endDate: Date;
      pricePerPerson: { toNumber(): number } | number;
      year: number;
    }[];
  }[];
}

function getPrice(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

export function PricingTable({ services }: PricingTableProps) {
  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo periodo di prezzo?")) {
      return;
    }
    try {
      await deletePricingPeriod(id);
      toast.success("Periodo eliminato");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore nell'eliminazione",
      );
    }
  }

  return (
    <div className="space-y-8">
      {services.map((service) => (
        <div key={service.id}>
          <h2 className="mb-3 text-xl font-semibold">{service.name}</h2>
          {service.pricingPeriods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun periodo di prezzo configurato
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Da</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead>Prezzo/persona</TableHead>
                  <TableHead>Anno</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {service.pricingPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {period.label}
                    </TableCell>
                    <TableCell>
                      {new Date(period.startDate).toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell>
                      {new Date(period.endDate).toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell>
                      {getPrice(period.pricePerPerson).toLocaleString("it-IT", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      €
                    </TableCell>
                    <TableCell>{period.year}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(period.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ))}
    </div>
  );
}
