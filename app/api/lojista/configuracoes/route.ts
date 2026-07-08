import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLojistaPerfilSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const lojista = await prisma.lojista.findUniqueOrThrow({
    where: { id: session.user.lojistaId },
    include: { user: { select: { name: true, email: true, phone: true, document: true } } },
  });

  return NextResponse.json({ data: lojista }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const parsed = updateLojistaPerfilSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { storeName, razaoSocial, inscricaoEstadual, phone, document } = parsed.data;

  const [lojista] = await prisma.$transaction([
    prisma.lojista.update({
      where: { id: session.user.lojistaId },
      data: { storeName, razaoSocial, inscricaoEstadual },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { phone, document },
    }),
  ]);

  return NextResponse.json({ data: lojista }, { status: 200 });
}
