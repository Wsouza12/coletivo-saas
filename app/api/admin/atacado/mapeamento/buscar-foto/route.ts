import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";
import { embedImagem, formatarVetor } from "@/lib/jina";

function getGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY nao configurada");
  return new Groq({ apiKey: key });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("foto") as File | null;
  if (!file) return NextResponse.json({ error: { code: "VALIDATION", message: "foto obrigatoria" } }, { status: 422 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  // 1. Identificacao por IA (Groq vision) — extrai nome/codigo/marca para busca textual
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        {
          type: "text",
          text: `Analise este produto e responda APENAS com JSON valido:\n{\n  "nome": "nome completo e especifico do produto",\n  "codigo": "codigo/referencia se visivel, senao null",\n  "marca": "marca se visivel, senao null",\n  "termosBusca": ["termo_especifico_1", "termo_especifico_2"]\n}\ntermosBusca: apenas termos ESPECIFICOS do produto, SEM palavras genericas.`,
        },
      ],
    }],
    temperature: 0.1,
    max_tokens: 300,
  });

  let extraido: { nome: string; codigo?: string | null; marca?: string | null; termosBusca?: string[] } = { nome: "" };
  try {
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    extraido = JSON.parse(jsonMatch?.[0] ?? "{}");
  } catch {
    return NextResponse.json({ error: { code: "IA_FALHOU" } }, { status: 422 });
  }
  if (!extraido.nome) return NextResponse.json({ error: { code: "PRODUTO_NAO_IDENTIFICADO" } }, { status: 422 });

  // 2. Busca vetorial CLIP contra fotos reais de ProdutoAtacado
  // Foto do cliente (produto real) vs foto do produto cadastrado = mesmo dominio visual
  const jinaKey = process.env.JINA_API_KEY;
  let produtosVisuais: any[] = [];
  let paginasCrop: any[] = [];

  if (jinaKey) {
    let vetor: string | null = null;
    try {
      const embedding = await embedImagem(base64, mimeType);
      vetor = formatarVetor(embedding);
    } catch (e) {
      console.error("Jina embed falhou:", e);
    }

    if (vetor) try {
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          p.id, p.nome, p.codigo, p.categoria, p.marca,
          p."imagemUrl", p."custoUnitario", p."precoVendaSugerido",
          p."unidadesPorCaixa", p."pesoKg", p.voltagem, p."codigoAnatel",
          f.id AS "fornecedorId", f.nome AS "fornecedorNome",
          1 - (p.embedding <=> $1::vector) AS similaridade
        FROM "ProdutoAtacado" p
        JOIN "FornecedorAtacado" f ON f.id = p."fornecedorId"
        WHERE p.embedding IS NOT NULL
        ORDER BY p.embedding <=> $1::vector
        LIMIT 15
      `, vetor);

      produtosVisuais = rows
        .filter((r: any) => r.similaridade > 0.25)
        .map((r: any) => ({
          id: r.id,
          nome: r.nome,
          codigo: r.codigo,
          categoria: r.categoria,
          marca: r.marca,
          imagemUrl: r.imagemUrl,
          custoUnitario: r.custoUnitario,
          precoVendaSugerido: r.precoVendaSugerido,
          unidadesPorCaixa: r.unidadesPorCaixa,
          pesoKg: r.pesoKg,
          voltagem: r.voltagem,
          codigoAnatel: r.codigoAnatel,
          fornecedor: { id: r.fornecedorId, nome: r.fornecedorNome },
          similaridade: Math.round(r.similaridade * 100),
        }));
    } catch (e) {
      console.error("Busca vetorial ProdutoAtacado falhou:", e);
    }

    // 2b. Busca vetorial em crops do catálogo (produtos não cadastrados)
    if (vetor) try {
      const cropRows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          mc.id AS "cropId", mc.pagina, mc."cropIndex", mc."imagemUrl",
          mc."catalogoId",
          cf.nome AS "catalogoNome",
          fa.id AS "fornecedorId", fa.nome AS "fornecedorNome",
          1 - (mc.embedding <=> $1::vector) AS similaridade
        FROM "MapaCatalogoCrop" mc
        JOIN "CatalogoFornecedor" cf ON cf.id = mc."catalogoId"
        JOIN "FornecedorAtacado" fa ON fa.id = cf."fornecedorId"
        WHERE mc.embedding IS NOT NULL
        ORDER BY mc.embedding <=> $1::vector
        LIMIT 10
      `, vetor);

      console.log(`Crops raw: ${cropRows.length}, scores:`, cropRows.map((r: any) => Math.round(r.similaridade * 100)));
      paginasCrop = cropRows
        .map((r: any) => ({
          cropId: r.cropId,
          pagina: r.pagina,
          cropIndex: r.cropIndex,
          imagemUrl: r.imagemUrl,
          catalogoId: r.catalogoId,
          catalogoNome: r.catalogoNome,
          fornecedor: { id: r.fornecedorId, nome: r.fornecedorNome },
          similaridade: Math.round(r.similaridade * 100),
        }));
    } catch (e) {
      console.error("Busca vetorial MapaCatalogoCrop falhou:", e);
    }
  }

  // 3. Busca textual (complemento para produtos sem embedding ou fora do threshold)
  const PALAVRAS_GENERICAS = new Set([
    "bluetooth", "eletrico", "manual", "digital", "portatil",
    "smart", "wifi", "usb", "led", "rgb", "mini", "pro", "plus", "lite",
    "preto", "branco", "azul", "verde", "vermelho", "rosa", "prata",
    "homologado", "anatel", "bivolt", "110v", "220v", "recarregavel",
  ]);

  const termosRaw = [
    extraido.codigo,
    extraido.nome,
    ...(extraido.termosBusca ?? []),
    extraido.marca,
  ]
    .filter((t): t is string => !!t && t.length >= 5)
    .filter((t) => !PALAVRAS_GENERICAS.has(t.toLowerCase()));
  const termos = [...new Set(termosRaw)].slice(0, 5);

  const orItens = termos.length > 0
    ? termos.map((t) => ({ nomeProduto: { contains: t, mode: "insensitive" as const } }))
    : [{ nomeProduto: { contains: extraido.nome, mode: "insensitive" as const } }];
  const orProdutos = termos.length > 0
    ? termos.map((t) => ({ nome: { contains: t, mode: "insensitive" as const } }))
    : [{ nome: { contains: extraido.nome, mode: "insensitive" as const } }];
  if (extraido.codigo) {
    orItens.push({ codigo: { contains: extraido.codigo, mode: "insensitive" } } as any);
    orProdutos.push({ codigo: { contains: extraido.codigo, mode: "insensitive" } } as any);
  }

  // Remove da busca textual os que a vetorial ja encontrou
  const idsVisuais = new Set(produtosVisuais.map((p) => p.id));

  const [itensMapeados, produtosSemItem] = await Promise.all([
    prisma.catalogoFornecedorItem.findMany({
      where: { OR: orItens },
      take: 20,
      orderBy: { nomeProduto: "asc" },
      include: {
        catalogo: { select: { id: true, nome: true, fornecedor: { select: { id: true, nome: true } } } },
        produtoAtacado: {
          select: {
            id: true, nome: true, codigo: true, categoria: true, marca: true,
            unidadesPorCaixa: true, pesoKg: true, imagemUrl: true,
            custoUnitario: true, precoVendaSugerido: true, voltagem: true, codigoAnatel: true,
          },
        },
      },
    }),
    prisma.produtoAtacado.findMany({
      where: {
        OR: orProdutos,
        itensCatalogo: { none: {} },
        NOT: idsVisuais.size > 0 ? { id: { in: [...idsVisuais] } } : undefined,
      },
      take: 10,
      select: {
        id: true, nome: true, codigo: true, categoria: true, marca: true,
        unidadesPorCaixa: true, pesoKg: true, imagemUrl: true,
        custoUnitario: true, precoVendaSugerido: true, voltagem: true, codigoAnatel: true,
        fornecedor: { select: { id: true, nome: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      extraido: { ...extraido, palavrasChave: extraido.termosBusca },
      // Visuais PRIMEIRO — foto vs foto, muito mais preciso
      produtosVisuais,
      paginasCrop,
      itens: itensMapeados,
      produtosSemItem,
      termosUsados: termos,
      buscaVetorial: jinaKey ? true : false,
    },
  });
}
