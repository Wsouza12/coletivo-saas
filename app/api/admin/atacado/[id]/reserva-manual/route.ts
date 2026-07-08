import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  criarReservaManual, listarReservasManuais, editarReservaManual, removerReservaManual,
} from "@/lib/atacado";

// Reserva manual do admin (prova social, sem Pix). id = id da rodada.
const schema = z.object({
  compradorNome: z.string().min(1),
  quantidade: z.number().int().positive(),
});

const editSchema = z.object({
  reservaId: z.string().min(1),
  compradorNome: z.string().min(1).optional(),
  quantidade: z.number().int().positive().optional(),
});

async function guard() {
  const session = await auth();
  if (!session?.user) return { erro: NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { erro: NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 }) };
  return { erro: null };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { erro } = await guard();
  if (erro) return erro;
  const { id } = await params;
  const reservas = await listarReservasManuais(id);
  return NextResponse.json({ data: { reservas } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { erro } = await guard();
  if (erro) return erro;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }
  try {
    const r = await criarReservaManual({ rodadaId: id, ...parsed.data });
    return NextResponse.json({ data: r }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "RESERVA_MANUAL_FALHOU", message: err instanceof Error ? err.message : "Erro" } },
      { status: 422 }
    );
  }
}

export async function PATCH(req: Request) {
  const { erro } = await guard();
  if (erro) return erro;
  const parsed = editSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }
  const { reservaId, ...dados } = parsed.data;
  try {
    const r = await editarReservaManual(reservaId, dados);
    return NextResponse.json({ data: r });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "EDITAR_FALHOU", message: err instanceof Error ? err.message : "Erro" } },
      { status: 422 }
    );
  }
}

export async function DELETE(req: Request) {
  const { erro } = await guard();
  if (erro) return erro;
  const { searchParams } = new URL(req.url);
  const reservaId = searchParams.get("reservaId");
  if (!reservaId) return NextResponse.json({ error: { code: "VALIDATION", message: "reservaId obrigatório" } }, { status: 422 });
  try {
    const r = await removerReservaManual(reservaId);
    return NextResponse.json({ data: r });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "REMOVER_FALHOU", message: err instanceof Error ? err.message : "Erro" } },
      { status: 422 }
    );
  }
}
