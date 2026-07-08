import { NextResponse } from "next/server";
import { imageSize } from "image-size";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadProdutoImagem } from "@/lib/storage";

// Mercado Livre recomenda mínimo 500x500px pra qualidade do anúncio.
const TAMANHO_MINIMO_PX = 500;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Produto não encontrado" } },
      { status: 404 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Arquivo de imagem é obrigatório" } },
      { status: 422 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const { width, height } = imageSize(buffer);
    if (!width || !height || width < TAMANHO_MINIMO_PX || height < TAMANHO_MINIMO_PX) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION",
            message: `Imagem muito pequena (${width ?? "?"}x${height ?? "?"}px). O Mercado Livre recomenda no mínimo ${TAMANHO_MINIMO_PX}x${TAMANHO_MINIMO_PX}px.`,
          },
        },
        { status: 422 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Não foi possível ler as dimensões da imagem" } },
      { status: 422 }
    );
  }

  let url: string;
  try {
    url = await uploadProdutoImagem(file, id);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: "Falha ao enviar imagem para o storage" } },
      { status: 502 }
    );
  }

  const totalImagens = await prisma.produtoImagem.count({ where: { produtoId: id } });

  const imagem = await prisma.produtoImagem.create({
    data: {
      produtoId: id,
      url,
      alt: produto.nome,
      ordem: totalImagens,
      principal: totalImagens === 0,
    },
  });

  return NextResponse.json({ data: imagem }, { status: 201 });
}
