import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { embedImagem, formatarVetor } from "@/lib/jina";

// Indexa embeddings CLIP das fotos reais de ProdutoAtacado.
// Chamada em lotes pelo painel — cada request processa ate 10 produtos.
// GET: retorna contagem pendentes. POST: indexa proximo lote.

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const [total, comEmbedding, semEmbedding] = await Promise.all([
    prisma.produtoAtacado.count({ where: { imagemUrl: { not: null } } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) FROM "ProdutoAtacado" WHERE "imagemUrl" IS NOT NULL AND embedding IS NOT NULL
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) FROM "ProdutoAtacado" WHERE "imagemUrl" IS NOT NULL AND embedding IS NULL
    `,
  ]);

  return NextResponse.json({
    data: {
      total,
      comEmbedding: Number((comEmbedding as any)[0]?.count ?? 0),
      semEmbedding: Number((semEmbedding as any)[0]?.count ?? 0),
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) return NextResponse.json({ error: { code: "JINA_NOT_CONFIGURED" } }, { status: 422 });

  // Jina: 100k tokens/min. Cada imagem grande consome muito — processa 5
  // sequencial por request, e o loop do painel espaça os requests no tempo.
  const produtos = await prisma.$queryRaw<{ id: string; imagemUrl: string }[]>`
    SELECT id, "imagemUrl" FROM "ProdutoAtacado"
    WHERE "imagemUrl" IS NOT NULL AND embedding IS NULL
    LIMIT 5
  `;

  if (produtos.length === 0) {
    return NextResponse.json({ data: { processados: 0, pendentes: 0 } });
  }

  let processados = 0;
  const erros: string[] = [];

  for (const produto of produtos) {
    try {
      const resp = await fetch(produto.imagemUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const embedding = await embedImagem(base64, "image/jpeg");
      await prisma.$executeRawUnsafe(
        `UPDATE "ProdutoAtacado" SET embedding = $1::vector WHERE id = $2`,
        formatarVetor(embedding),
        produto.id,
      );
      processados++;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      // Rate limit → devolve o que já processou, sem marcar como erro fatal
      if (msg.includes("429") || msg.includes("RATE")) {
        const [{ count: pend }] = await prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) FROM "ProdutoAtacado" WHERE "imagemUrl" IS NOT NULL AND embedding IS NULL
        `;
        return NextResponse.json({ data: { processados, pendentes: Number(pend), rateLimited: true, erros } });
      }
      erros.push(`${produto.id}: ${msg}`);
    }
  }

  const [{ count: pendentes }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) FROM "ProdutoAtacado" WHERE "imagemUrl" IS NOT NULL AND embedding IS NULL
  `;

  return NextResponse.json({ data: { processados, pendentes: Number(pendentes), erros } });
}
