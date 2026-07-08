import Link from "next/link";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AguardandoAprovacaoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Clock className="size-6" />
          </div>
          <CardTitle className="text-xl">Cadastro em análise</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            Seu cadastro foi recebido e está aguardando aprovação do administrador.
            Você receberá um email assim que sua conta for liberada.
          </p>
          <Button variant="outline" render={<Link href="/login" />}>
            Voltar para o login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
