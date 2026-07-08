import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LojistaSidebarNav } from "@/components/lojista/lojista-sidebar-nav";
import { LojistaTopbar } from "@/components/lojista/lojista-topbar";

// router.refresh() em ações do dashboard reexecuta o layout inteiro — sem cache,
// isso disparava 3 queries Prisma a cada clique. 30s de cache é aceitável pra
// dados de sidebar (nome da loja, badge de pedidos novos, status de integração).
const getDadosLayout = unstable_cache(
  async (lojistaId: string) => {
    const [lojista, pedidosNovos, integracoes] = await Promise.all([
      prisma.lojista.findUniqueOrThrow({ where: { id: lojistaId } }),
      prisma.pedido.count({ where: { lojistaId, status: "NOVO" } }),
      prisma.integracao.findMany({ where: { lojistaId, ativa: true } }),
    ]);
    return { lojista, pedidosNovos, integracoes };
  },
  ["lojista-layout"],
  { revalidate: 30 },
);

export default async function LojistaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    redirect("/login");
  }
  if (session.user.status === "PENDING") {
    redirect("/aguardando-aprovacao");
  }

  const lojistaId = session.user.lojistaId;

  const { lojista, pedidosNovos, integracoes } = await getDadosLayout(lojistaId);

  if (lojista.acessoExpiraEm && lojista.acessoExpiraEm < new Date()) {
    redirect("/assinatura-expirada");
  }

  const mlConectado = integracoes.some((i) => i.plataforma === "MERCADOLIVRE");
  const shopeeConectado = integracoes.some((i) => i.plataforma === "SHOPEE");

  const diasRestantesAcesso = lojista.acessoExpiraEm
    ? Math.ceil((lojista.acessoExpiraEm.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[240px] shrink-0 border-r border-sidebar-border md:block">
        <LojistaSidebarNav storeName={lojista.storeName} pedidosNovos={pedidosNovos} />
      </aside>
      <div className="flex flex-1 flex-col">
        <LojistaTopbar
          lojistaName={session.user.name ?? "Lojista"}
          storeName={lojista.storeName}
          pedidosNovos={pedidosNovos}
          mlConectado={mlConectado}
          shopeeConectado={shopeeConectado}
          diasRestantesAcesso={diasRestantesAcesso}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
