import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailTeste } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  await sendEmailTeste(admin.email);
  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
