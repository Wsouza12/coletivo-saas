import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listarGruposWhatsapp } from "@/lib/evolution";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const [grupos, vinculos, produtosCategorias] = await Promise.all([
    listarGruposWhatsapp().catch((err) => {
      console.error("Falha ao listar grupos do WhatsApp:", err);
      return [];
    }),
    prisma.grupoWhatsappCategoria.findMany(),
    prisma.produtoAtacado.findMany({ select: { categoria: true }, distinct: ["categoria"] })
  ]);

  const allCategoriesSet = new Set<string>([
    ...vinculos.map((v) => v.categoria),
    ...produtosCategorias.map((p) => p.categoria)
  ]);
  const categoriasUnicas = Array.from(allCategoriesSet).sort();

  return NextResponse.json({ data: { grupos, vinculos, categorias: categoriasUnicas } }, { status: 200 });
}

const vincularSchema = z.object({
  categoria: z.string().min(1),
  grupoId: z.string().min(1),
  grupoNome: z.string().min(1),
  linkConvite: z.string().url().optional().or(z.literal("")),
  moderadorAtivo: z.boolean().optional(),
  assistenteGroqAtivo: z.boolean().optional(),
  assistenteGroqPrompt: z.string().optional(),
  aceitaSolicitacoes: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = vincularSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const linkConvite = parsed.data.linkConvite || null;
  const optionalFields: any = {};
  if (parsed.data.moderadorAtivo !== undefined) optionalFields.moderadorAtivo = parsed.data.moderadorAtivo;
  if (parsed.data.assistenteGroqAtivo !== undefined) optionalFields.assistenteGroqAtivo = parsed.data.assistenteGroqAtivo;
  if (parsed.data.assistenteGroqPrompt !== undefined) optionalFields.assistenteGroqPrompt = parsed.data.assistenteGroqPrompt;
  if (parsed.data.aceitaSolicitacoes !== undefined) optionalFields.aceitaSolicitacoes = parsed.data.aceitaSolicitacoes;
  
  const vinculo = await prisma.grupoWhatsappCategoria.upsert({
    where: { categoria: parsed.data.categoria },
    create: {
      categoria: parsed.data.categoria,
      grupoId: parsed.data.grupoId,
      grupoNome: parsed.data.grupoNome,
      linkConvite,
      ...optionalFields,
    },
    update: { 
      grupoId: parsed.data.grupoId, 
      grupoNome: parsed.data.grupoNome, 
      linkConvite, 
      ...optionalFields 
    },
  });

  return NextResponse.json({ data: vinculo }, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const categoria = new URL(req.url).searchParams.get("categoria");
  if (!categoria) return NextResponse.json({ error: { code: "VALIDATION", message: "categoria obrigatória" } }, { status: 422 });

  await prisma.grupoWhatsappCategoria.delete({ where: { categoria } }).catch(() => {});
  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
