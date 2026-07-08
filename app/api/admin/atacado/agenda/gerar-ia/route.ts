import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarGatilhosVenda } from "@/lib/groq";

// Gera N mensagens (gatilhos / conteúdo) via IA — NÃO agenda.
// Pode alimentar a IA com dados REAIS: caixas abertas e produtos/catálogos novos.
// Privacidade: só nome, preço de venda, progresso e link públicos — nunca custo,
// fornecedor ou página de catálogo.
const schema = z.object({
  tema: z.string().min(3),
  quantidade: z.number().int().min(1).max(10),
  caixasAbertas: z.boolean().optional(),
  novidades: z.boolean().optional(),
  busca: z.string().optional(), // nome de um produto/caixa pra focar a mensagem
});

function fmtBRL(v: unknown): string | null {
  if (v == null) return null;
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }
  const { tema, quantidade, caixasAbertas, novidades, busca } = parsed.data;

  const app = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dropyatacado.com.br").replace(/\/$/, "");
  const blocos: string[] = [];
  let imagemSugerida: string | null = null;

  // ── Busca específica: "puxa" a caixa/produto pelo nome digitado ──
  const termo = busca?.trim();
  if (termo) {
    const [rodadasFoco, produtosFoco] = await Promise.all([
      prisma.rodadaAtacado.findMany({
        where: { status: "ABERTA", produtoAtacado: { nome: { contains: termo, mode: "insensitive" } } },
        take: 5,
        select: {
          slug: true, unidadesReservadas: true, metaUnidades: true,
          produtoAtacado: { select: { nome: true, imagemUrl: true, precoCatalogo: true, precoVendaSugerido: true } },
        },
      }),
      prisma.produtoAtacado.findMany({
        where: { ativo: true, isRascunho: false, nome: { contains: termo, mode: "insensitive" } },
        take: 5,
        select: { nome: true, imagemUrl: true, categoria: true, precoCatalogo: true, precoVendaSugerido: true },
      }),
    ]);

    if (rodadasFoco.length === 0 && produtosFoco.length === 0) {
      return NextResponse.json({ data: { mensagens: [], naoEncontrado: true, termo } });
    }

    const linhas: string[] = [];
    for (const r of rodadasFoco) {
      const preco = fmtBRL(r.produtoAtacado.precoCatalogo) ?? fmtBRL(r.produtoAtacado.precoVendaSugerido);
      const faltam = Math.max(0, r.metaUnidades - r.unidadesReservadas);
      const link = r.slug ? `${app}/r/${r.slug}` : "";
      linhas.push(`- CAIXA ABERTA: ${r.produtoAtacado.nome}${preco ? ` — ${preco}` : ""} — ${r.unidadesReservadas}/${r.metaUnidades} un (faltam ${faltam})${link ? ` — link: ${link}` : ""}`);
    }
    const nomesEmCaixa = new Set(rodadasFoco.map((r) => r.produtoAtacado.nome));
    for (const p of produtosFoco) {
      if (nomesEmCaixa.has(p.nome)) continue; // já listado como caixa aberta
      const preco = fmtBRL(p.precoCatalogo) ?? fmtBRL(p.precoVendaSugerido);
      linhas.push(`- PRODUTO: ${p.nome}${p.categoria ? ` (${p.categoria})` : ""}${preco ? ` — ${preco}` : ""}`);
    }
    blocos.push(`FOCO DA MENSAGEM (o admin quer falar disto):\n${linhas.join("\n")}`);

    // Imagem sugerida = foto do 1º item focado (pra anexar nas mensagens)
    imagemSugerida =
      rodadasFoco.find((r) => r.produtoAtacado.imagemUrl)?.produtoAtacado.imagemUrl ??
      produtosFoco.find((p) => p.imagemUrl)?.imagemUrl ?? null;
  }

  if (caixasAbertas) {
    const rodadas = await prisma.rodadaAtacado.findMany({
      where: { status: "ABERTA" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        slug: true, unidadesReservadas: true, metaUnidades: true,
        produtoAtacado: { select: { nome: true, precoCatalogo: true, precoVendaSugerido: true } },
      },
    });
    if (rodadas.length > 0) {
      const linhas = rodadas.map((r) => {
        const preco = fmtBRL(r.produtoAtacado.precoCatalogo) ?? fmtBRL(r.produtoAtacado.precoVendaSugerido);
        const faltam = Math.max(0, r.metaUnidades - r.unidadesReservadas);
        const link = r.slug ? `${app}/r/${r.slug}` : "";
        return `- ${r.produtoAtacado.nome}${preco ? ` — ${preco}` : ""} — ${r.unidadesReservadas}/${r.metaUnidades} un reservadas (faltam ${faltam})${link ? ` — link: ${link}` : ""}`;
      });
      blocos.push(`CAIXAS ABERTAS AGORA:\n${linhas.join("\n")}`);
    }
  }

  if (novidades) {
    const produtos = await prisma.produtoAtacado.findMany({
      where: { ativo: true, isRascunho: false },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { nome: true, categoria: true, precoCatalogo: true, precoVendaSugerido: true },
    });
    if (produtos.length > 0) {
      const linhas = produtos.map((p) => {
        const preco = fmtBRL(p.precoCatalogo) ?? fmtBRL(p.precoVendaSugerido);
        return `- ${p.nome}${p.categoria ? ` (${p.categoria})` : ""}${preco ? ` — ${preco}` : ""}`;
      });
      blocos.push(`PRODUTOS/CATÁLOGO NOVOS:\n${linhas.join("\n")}`);
    }
  }

  const contexto = blocos.join("\n\n");

  try {
    const mensagens = await gerarGatilhosVenda(tema, quantidade, contexto || undefined);
    return NextResponse.json({ data: { mensagens, temContexto: !!contexto, imagemSugerida } });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "IA_FALHOU", message: err instanceof Error ? err.message : "Erro" } },
      { status: 422 }
    );
  }
}
