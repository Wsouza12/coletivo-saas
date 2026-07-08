import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePerfilSchema } from "@/lib/validations";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const parsed = updatePerfilSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { name, email, currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  if (newPassword) {
    const senhaValida = await bcrypt.compare(currentPassword ?? "", user.password);
    if (!senhaValida) {
      return NextResponse.json(
        { error: { code: "INVALID_PASSWORD", message: "Senha atual incorreta" } },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      email,
      ...(newPassword ? { password: await bcrypt.hash(newPassword, 12) } : {}),
    },
  });

  return NextResponse.json(
    { data: { name: updated.name, email: updated.email } },
    { status: 200 }
  );
}
