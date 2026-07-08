import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Aba Produtos da Agenda: pré-cadastra o produto (se novo) OU atualiza SÓ o preço
// (se já existe — casamento por codigo + fornecedorId). Nunca mexe em imagem nem
// variação de produto já cadastrado, conforme regra do usuário.
const schema = z.object({
  catalogoId: z.string().min(1),
  imagemUrl: z.string().url().optional(), // print do recorte (só usado ao criar)
  codigo: z.string().optional(),
  nome: z.string().min(1),
  categoria: z.string().optional(),
  marca: z.string().optional(),
  custoUnitario: z.number().nonnegative().optional(),
  precoCatalogo: z.number().nonnegative().optional(),
  precoVendaSugerido: z.number().nonnegative().optional(),
  unidadesPorCaixa: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }
  const d = parsed.data;

  const catalogo = await prisma.catalogoFornecedor.findUnique({
    where: { id: d.catalogoId },
    select: { fornecedorId: true },
  });
  if (!catalogo) return NextResponse.json({ error: { code: "CATALOGO_NAO_ENCONTRADO" } }, { status: 404 });

  // Casa por codigo + fornecedorId (mesma regra de subir catálogo novo)
  const existente = d.codigo
    ? await prisma.produtoAtacado.findFirst({
        where: { codigo: { equals: d.codigo, mode: "insensitive" }, fornecedorId: catalogo.fornecedorId },
      })
    : null;

  if (existente) {
    // ATUALIZA SÓ PREÇO — nunca imagem nem variação
    const atualizado = await prisma.produtoAtacado.update({
      where: { id: existente.id },
      data: {
        ...(d.custoUnitario != null ? { custoUnitario: d.custoUnitario } : {}),
        ...(d.precoCatalogo != null ? { precoCatalogo: d.precoCatalogo } : {}),
        ...(d.precoVendaSugerido != null ? { precoVendaSugerido: d.precoVendaSugerido } : {}),
      },
    });
    return NextResponse.json({ data: { produto: atualizado, acao: "atualizado" } });
  }

  // PRÉ-CADASTRO — cria rascunho com a imagem do print
  const criado = await prisma.produtoAtacado.create({
    data: {
      codigo: d.codigo ?? null,
      nome: d.nome,
      descricao: "",
      categoria: d.categoria ?? "Geral",
      marca: d.marca ?? null,
      imagemUrl: d.imagemUrl ?? null,
      custoUnitario: d.custoUnitario ?? 0,
      precoCatalogo: d.precoCatalogo ?? null,
      precoVendaSugerido: d.precoVendaSugerido ?? null,
      unidadesPorCaixa: d.unidadesPorCaixa ?? 1,
      fornecedorId: catalogo.fornecedorId,
      isRascunho: true,
    },
  });
  return NextResponse.json({ data: { produto: criado, acao: "criado" } });
}
