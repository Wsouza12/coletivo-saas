import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PagarAssinaturaButton } from "@/components/lojista/pagar-assinatura-button";

export default async function AssinaturaExpiradaPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LOJISTA") redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Lock className="size-6" />
          </div>
          <CardTitle className="text-xl">Seu acesso expirou</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            Seu teste grátis ou assinatura terminou. Pague para liberar 30 dias de acesso
            completo à plataforma.
          </p>
          <PagarAssinaturaButton />
        </CardContent>
      </Card>
    </div>
  );
}
