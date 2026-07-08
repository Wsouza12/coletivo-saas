import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterCompraPorId, obterListaCompleta, COOKIE_LISTA } from "@/lib/lista-fornecedores";
import { ListaView } from "@/components/lista/lista-view";

export const dynamic = "force-dynamic";

export default async function MinhaListaPage() {
  const compraId = (await cookies()).get(COOKIE_LISTA)?.value;
  if (!compraId) redirect("/fornecedores/entrar");

  const compra = await obterCompraPorId(compraId);
  if (!compra) redirect("/fornecedores/entrar");

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
    <ListaView
      nome={compra.compradorNome}
      fornecedores={fornecedores}
      soCatalogos={soCatalogos}
      incluiComunidade={compra.incluiComunidade}
      linkComunidade={linkComunidade}
    />
  );
}
