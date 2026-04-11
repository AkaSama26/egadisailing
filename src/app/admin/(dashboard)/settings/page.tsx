import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Impostazioni</h1>
      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Nome:</strong> {session?.user?.name}</p>
          <p><strong>Email:</strong> {session?.user?.email}</p>
          <p><strong>Ruolo:</strong> {(session?.user as any)?.role}</p>
        </CardContent>
      </Card>
    </div>
  );
}
