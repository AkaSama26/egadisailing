import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface ServiceCardProps {
  title: string;
  description: string;
  priceFrom?: string;
  href: string;
  icon?: React.ReactNode;
}

export function ServiceCard({
  title,
  description,
  priceFrom,
  href,
  icon,
}: ServiceCardProps) {
  return (
    <Link href={href}>
      <Card className="group h-full transition-all hover:shadow-lg hover:-translate-y-1 border-none bg-white/80 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          {icon && (
            <div className="text-[var(--color-turquoise)]">{icon}</div>
          )}
          <h3 className="font-heading text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
          {priceFrom && (
            <p className="text-sm font-semibold text-[var(--color-gold)]">
              {priceFrom}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
