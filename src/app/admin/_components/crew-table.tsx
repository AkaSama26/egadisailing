"use client";

import { toast } from "sonner";
import { toggleCrewMemberActive } from "../_actions/crew-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CrewTableProps {
  crewMembers: {
    id: string;
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
    active: boolean;
  }[];
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  SKIPPER: "default",
  CHEF: "secondary",
  HOSTESS: "outline",
};

const roleLabel: Record<string, string> = {
  SKIPPER: "Skipper",
  CHEF: "Chef",
  HOSTESS: "Hostess",
};

export function CrewTable({ crewMembers }: CrewTableProps) {
  async function handleToggle(id: string, currentActive: boolean) {
    try {
      await toggleCrewMemberActive(id, !currentActive);
      toast.success(
        currentActive ? "Membro disattivato" : "Membro riattivato",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore nell'aggiornamento",
      );
    }
  }

  if (crewMembers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun membro crew trovato
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Ruolo</TableHead>
          <TableHead>Telefono</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Stato</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {crewMembers.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="font-medium">{member.name}</TableCell>
            <TableCell>
              <Badge variant={roleBadgeVariant[member.role] ?? "default"}>
                {roleLabel[member.role] ?? member.role}
              </Badge>
            </TableCell>
            <TableCell>{member.phone ?? "—"}</TableCell>
            <TableCell>{member.email ?? "—"}</TableCell>
            <TableCell>
              <Button
                variant={member.active ? "outline" : "ghost"}
                size="sm"
                onClick={() => handleToggle(member.id, member.active)}
              >
                {member.active ? "Attivo" : "Inattivo"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
