import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            Benvenuto, <span className="font-semibold">{session?.user?.name}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Ruolo: {(session?.user as any)?.role}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
