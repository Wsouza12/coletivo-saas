import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispararPostagem } from "@/lib/agenda";

const blocoSchema = z.object({
  tipo: z.enum(["TEXTO", "IMAGEM", "VIDEO"]),
  url: z.string().url().optional(),
  legenda: z.string().optional(),
});

const schema = z.object({
  tipo: z.enum(["PRODUTO", "CATALOGO", "MENSAGEM"]),
  titulo: z.string().optional(),
  agendadoPara: z.string().datetime().optional(), // ISO; ausente = enviar agora
  gruposJids: z.array(z.string().min(1)).min(1).max(2),
  blocos: z.array(blocoSchema).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const postagens = await prisma.postagemAgendada.findMany({
    orderBy: [{ status: "asc" }, { agendadoPara: "desc" }],
    take: 100,
  });
  return NextResponse.json({ data: { postagens } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }
  const { tipo, titulo, agendadoPara, gruposJids, blocos } = parsed.data;

  // Sem data = enviar agora (agenda no passado imediato)
  const quando = agendadoPara ? new Date(agendadoPara) : new Date();
  const enviarAgora = !agendadoPara || quando.getTime() <= Date.now();

  const post = await prisma.postagemAgendada.create({
    data: {
      tipo,
      titulo: titulo ?? null,
      agendadoPara: quando,
      gruposJids,
      blocos: blocos as any,
      status: "PENDENTE",
    },
  });

  // Se for "enviar agora", dispara já (não espera o cron). Não bloqueia a resposta
  // por muito tempo — o disparo tem pausas, então respondemos e deixamos rodar.
  if (enviarAgora) {
    dispararPostagem(post.id).catch((e) => console.error("Disparo imediato falhou:", e));
    return NextResponse.json({ data: { post, enviando: true } });
  }

  return NextResponse.json({ data: { post, agendada: true } });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: { code: "VALIDATION", message: "id obrigatório" } }, { status: 422 });

  // Só cancela o que ainda não saiu; histórico enviado permanece.
  await prisma.postagemAgendada.updateMany({
    where: { id, status: { in: ["PENDENTE", "ERRO"] } },
    data: { status: "CANCELADA" },
  });
  return NextResponse.json({ data: { ok: true } });
}
