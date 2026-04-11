"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CustomerTableProps {
  customers: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    nationality: string | null;
    _count: { bookings: number };
    totalSpent: number;
  }[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Cerca per nome o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun cliente trovato
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Nazionalit&agrave;</TableHead>
              <TableHead>Prenotazioni</TableHead>
              <TableHead>Spesa Totale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="font-medium underline underline-offset-4 hover:text-primary"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone ?? "\u2014"}</TableCell>
                <TableCell>{customer.nationality ?? "\u2014"}</TableCell>
                <TableCell>{customer._count.bookings}</TableCell>
                <TableCell>{customer.totalSpent.toFixed(2)} \u20ac</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
