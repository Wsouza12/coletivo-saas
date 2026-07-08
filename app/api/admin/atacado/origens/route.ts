import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ORIGEM_DIRETO, rotuloOrigem, codigoOrigemGrupo } from "@/lib/origem";

// Relatório de origem: cliques + reservas (total e pagas) por origem, e
// dados pro gerador de "link pronto por origem" (caixas abertas + códigos de grupo).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const [cliques, reservasTotais, reservasPagas, rodadasAbertas, grupos] = await Promise.all([
    prisma.cliqueLink.groupBy({ by: ["origem"], _count: { _all: true } }),
    prisma.reservaAtacado.groupBy({ by: ["origem"], _count: { _all: true } }),
    prisma.reservaAtacado.groupBy({ by: ["origem"], where: { status: "PAGO" }, _count: { _all: true } }),
    prisma.rodadaAtacado.findMany({
      where: { status: "ABERTA" },
      orderBy: { createdAt: "desc" },
      select: { slug: true, produtoAtacado: { select: { nome: true } } },
    }),
    prisma.grupoWhatsappCategoria.findMany({ select: { grupoId: true, grupoNome: true, categoria: true } }),
  ]);

  // Junta as métricas por origem
  const mapa = new Map<string, { origem: string; rotulo: string; cliques: number; reservas: number; pagas: number }>();
  const bump = (origemRaw: string | null, campo: "cliques" | "reservas" | "pagas", n: number) => {
    const origem = origemRaw || ORIGEM_DIRETO;
    const cur = mapa.get(origem) ?? { origem, rotulo: rotuloOrigem(origem), cliques: 0, reservas: 0, pagas: 0 };
    cur[campo] += n;
    mapa.set(origem, cur);
  };
  cliques.forEach((c) => bump(c.origem, "cliques", c._count._all));
  reservasTotais.forEach((r) => bump(r.origem, "reservas", r._count._all));
  reservasPagas.forEach((r) => bump(r.origem, "pagas", r._count._all));

  const linhas = [...mapa.values()].sort((a, b) => b.pagas - a.pagas || b.cliques - a.cliques);

  // Códigos de origem por grupo (pro gerador de link)
  const origensGrupo = await Promise.all(
    grupos.map(async (g) => ({
      grupoNome: g.grupoNome || g.categoria,
      codigo: await codigoOrigemGrupo(g.grupoId),
    }))
  );
  // Redes sociais / canais pré-definidos (sempre disponíveis pro gerador de link)
  const canaisFixos = [
    { grupoNome: "Instagram", codigo: "instagram" },
    { grupoNome: "Instagram — Bio", codigo: "instagram_bio" },
    { grupoNome: "Instagram — Stories", codigo: "instagram_stories" },
    { grupoNome: "Facebook", codigo: "facebook" },
    { grupoNome: "TikTok", codigo: "tiktok" },
    { grupoNome: "YouTube", codigo: "youtube" },
    { grupoNome: "Kwai", codigo: "kwai" },
    { grupoNome: "WhatsApp — Status", codigo: "wpp_status" },
    { grupoNome: "WhatsApp — Divulgação avulsa", codigo: "wpp_avulso" },
    { grupoNome: "Telegram", codigo: "telegram" },
  ];
  // Dedup por código (grupos primeiro, depois canais fixos)
  const origensDisponiveis = Array.from(
    new Map([...origensGrupo, ...canaisFixos].map((o) => [o.codigo, o])).values()
  );

  return NextResponse.json({
    data: {
      linhas,
      caixas: rodadasAbertas.map((r) => ({ slug: r.slug, nome: r.produtoAtacado.nome })),
      origens: origensDisponiveis,
    },
  });
}
