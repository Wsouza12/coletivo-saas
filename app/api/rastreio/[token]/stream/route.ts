import { buscarRastreioPublico } from "@/lib/rastreio";

export const dynamic = "force-dynamic";

// SSE público — envia o estado atual do pedido e empurra atualizações quando o status muda.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const encoder = new TextEncoder();
  let lastUpdatedAt: string | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tick = async () => {
        if (closed) return;
        const rastreio = await buscarRastreioPublico(token);
        if (!rastreio) {
          send({ error: "NOT_FOUND" });
          return;
        }
        if (rastreio.updatedAt !== lastUpdatedAt) {
          lastUpdatedAt = rastreio.updatedAt;
          send(rastreio);
        }
      };

      await tick();
      const interval = setInterval(tick, 3000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
