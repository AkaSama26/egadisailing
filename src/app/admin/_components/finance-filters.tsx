"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function FinanceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card>
      <CardContent className="flex gap-4 items-end pt-6">
        <div className="space-y-2">
          <Label>Da</Label>
          <Input
            type="date"
            defaultValue={searchParams.get("from") || ""}
            onChange={(e) => updateParam("from", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>A</Label>
          <Input
            type="date"
            defaultValue={searchParams.get("to") || ""}
            onChange={(e) => updateParam("to", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
