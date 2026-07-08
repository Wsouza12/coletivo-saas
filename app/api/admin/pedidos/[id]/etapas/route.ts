import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { etapaPedidoFormSchema } from "@/lib/validations";
import { uploadEtapaFoto, getEtapaFotoSignedUrl } from "@/lib/storage";

// Upload de foto de prova de envio. Acesso restrito a ADMIN — nunca exposto a
// cliente final ou lojista (a foto fica em bucket privado no Supabase Storage).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;

  const formData = await req.formData();
  const foto = formData.get("foto");
  const parsed = etapaPedidoFormSchema.safeParse({ etapa: formData.get("etapa") });

  if (!(foto instanceof File) || foto.size === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Foto é obrigatória" } },
      { status: 422 }
    );
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const pedido = await prisma.pedido.findUnique({ where: { id } });
  if (!pedido) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  const path = await uploadEtapaFoto(foto, id, parsed.data.etapa);

  const registro = await prisma.etapaPedido.create({
    data: {
      pedidoId: id,
      etapa: parsed.data.etapa,
      fotoUrl: path,
      criadoPor: session.user.id,
    },
  });

  return NextResponse.json({ data: registro }, { status: 201 });
}

// Lista as provas de envio do pedido com URLs assinadas (curta duração) — só ADMIN.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;

  const etapas = await prisma.etapaPedido.findMany({
    where: { pedidoId: id },
    orderBy: { criadoEm: "asc" },
  });

  const comUrl = await Promise.all(
    etapas.map(async (e) => ({
      ...e,
      fotoUrlAssinada: await getEtapaFotoSignedUrl(e.fotoUrl),
    }))
  );

  return NextResponse.json({ data: comUrl }, { status: 200 });
}
