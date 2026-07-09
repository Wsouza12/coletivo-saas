import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criarProdutoAtacadoSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const fornecedorId = searchParams.get("fornecedorId");

  const where = fornecedorId ? { fornecedorId } : {};

  const produtos = await prisma.produtoAtacado.findMany({
    where,
    include: { fornecedor: { select: { id: true, nome: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: produtos }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = criarProdutoAtacadoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  let { tamanhosInput, coresInput, coresVariadas, fornecedorId, ...dadosProduto } = parsed.data;

  if (fornecedorId === "ESTOQUE_PROPRIO") {
    let f = await prisma.fornecedorAtacado.findFirst({ where: { isEstoqueProprio: true } });
    if (!f) {
      f = await prisma.fornecedorAtacado.create({
        data: { nome: "📦 ESTOQUE PRÓPRIO (MEU CATÁLOGO)", isEstoqueProprio: true, telefone: "" },
      });
    }
    fornecedorId = f.id;
  }

  const produto = await prisma.produtoAtacado.create({
    data: { ...dadosProduto, fornecedorId, coresVariadas: coresVariadas ?? false },
  });

  // Cria variações de tamanho
  if (tamanhosInput?.trim()) {
    const tamanhos = tamanhosInput.split(",").map((t) => t.trim()).filter(Boolean);
    await prisma.produtoAtacadoCor.createMany({
      data: tamanhos.map((nome, i) => ({
        produtoAtacadoId: produto.id,
        tipo: "TAMANHO",
        nome,
        ordem: i,
      })),
    });
  }

  // Cria variações de cor (só quando não é grade variada)
  if (!coresVariadas && coresInput?.trim()) {
    const cores = coresInput.split(",").map((c) => c.trim()).filter(Boolean);
    await prisma.produtoAtacadoCor.createMany({
      data: cores.map((nome, i) => ({
        produtoAtacadoId: produto.id,
        tipo: "COR",
        nome,
        ordem: i,
      })),
    });
  }

  return NextResponse.json({ data: produto }, { status: 201 });
}
