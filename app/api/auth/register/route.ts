import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { registerLojistaSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerLojistaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { name, email, password, storeName, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: { code: "EMAIL_IN_USE", message: "Este email já está cadastrado" } },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const acessoExpiraEm = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        phone,
        role: "LOJISTA",
        status: "ACTIVE",
      },
    });

    await tx.lojista.create({
      data: {
        userId: user.id,
        storeName,
        acessoExpiraEm,
      },
    });
  });

  if (process.env.RESEND_API_KEY && process.env.ADMIN_SEED_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "DropSync <onboarding@resend.dev>",
        to: process.env.ADMIN_SEED_EMAIL,
        subject: "Novo cadastro de lojista — DropSync",
        text: `${name} (${email}) cadastrou a loja "${storeName}" e começou o teste grátis de 3 dias.`,
      });
    } catch (err) {
      console.error("Falha ao enviar email de notificação ao admin:", err);
    }
  }

  return NextResponse.json(
    { data: { message: "Cadastro realizado. Você tem 3 dias de teste grátis." } },
    { status: 201 }
  );
}
