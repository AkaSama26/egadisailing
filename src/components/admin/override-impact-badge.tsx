import { Badge } from "@/components/ui/badge";

export function OverrideImpactBadge({ channels }: { channels: string[] }) {
  const hasOta = channels.some((c) => c !== "DIRECT");
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {hasOta && <Badge variant="destructive">ALTO IMPATTO</Badge>}
      {channels.map((c) => (
        <Badge key={c} variant={c === "DIRECT" ? "secondary" : "outline"}>
          {c}
        </Badge>
      ))}
    </div>
  );
}
