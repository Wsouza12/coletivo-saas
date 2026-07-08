import { prisma } from "@/lib/prisma";
import { obterListaCompleta } from "@/lib/lista-fornecedores";
import { ListaView } from "@/components/lista/lista-view";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AcessoListaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const compra = await prisma.compraListaFornecedores.findUnique({
    where: { token },
    select: { status: true, compradorNome: true, tipo: true, incluiComunidade: true },
  });

  if (!compra || compra.status !== "PAGO") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0906] p-4 text-[#F5F1EA]">
        <div className="rounded-xl border border-white/10 bg-[#141009] p-8 text-center max-w-sm flex flex-col items-center gap-3">
          <Lock className="size-8 text-[#8a8071]" />
          <h1 className="font-semibold">Acesso não liberado</h1>
          <p className="text-sm text-[#B7AFA2]">Este link só funciona após a confirmação do pagamento.</p>
          <a href="/fornecedores/entrar" className="text-sm text-[#22C55E] underline">Entrar com meu CPF</a>
        </div>
      </div>
    );
  }

  const soCatalogos = compra.tipo === "CATALOGOS";
  const todos = await obterListaCompleta();
  const fornecedores = soCatalogos ? todos.filter((f) => f.catalogos.length > 0) : todos;

  let linkComunidade: string | null = null;
  if (compra.incluiComunidade) {
    const c =
      (await prisma.grupoWhatsappCategoria.findFirst({ where: { categoria: "AVISOS_COMUNIDADE", linkConvite: { not: null } }, select: { linkConvite: true } })) ??
      (await prisma.grupoWhatsappCategoria.findFirst({ where: { linkConvite: { not: null } }, select: { linkConvite: true } }));
    linkComunidade = c?.linkConvite ?? null;
  }

  return (
    <ListaView nome={compra.compradorNome} fornecedores={fornecedores} soCatalogos={soCatalogos}
      incluiComunidade={compra.incluiComunidade} linkComunidade={linkComunidade} />
  );
}
