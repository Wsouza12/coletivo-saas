import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConfiguracoesEmpresaForm } from "@/components/lojista/configuracoes-empresa-form";
import { ConfiguracoesPerfilForm } from "@/components/admin/configuracoes-perfil-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LojistaConfiguracoesPage() {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const lojista = await prisma.lojista.findUniqueOrThrow({
    where: { id: session.user.lojistaId },
    include: { user: { select: { name: true, email: true, phone: true, document: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da conta</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfiguracoesPerfilForm initialName={lojista.user.name} initialEmail={lojista.user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfiguracoesEmpresaForm
            initialStoreName={lojista.storeName}
            initialPhone={lojista.user.phone ?? ""}
            initialDocument={lojista.user.document ?? ""}
            initialRazaoSocial={lojista.razaoSocial ?? ""}
            initialInscricaoEstadual={lojista.inscricaoEstadual ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
