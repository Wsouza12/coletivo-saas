import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLojistaAprovado, sendLojistaSuspenso } from "@/lib/email";

const schema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const lojista = await prisma.lojista.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!lojista) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Lojista não encontrado" } },
      { status: 404 }
    );
  }

  const { status } = parsed.data;

  await prisma.user.update({
    where: { id: lojista.userId },
    data: { status },
  });

  if (status === "ACTIVE" && lojista.user.status !== "ACTIVE") {
    await prisma.lojista.update({
      where: { id },
      data: { approvedAt: new Date(), approvedBy: session.user.id },
    });
    await sendLojistaAprovado({ email: lojista.user.email, storeName: lojista.storeName });
  } else if (status === "SUSPENDED") {
    await sendLojistaSuspenso({ email: lojista.user.email, storeName: lojista.storeName });
  }

  return NextResponse.json({ data: { status } }, { status: 200 });
}
