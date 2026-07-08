import { notFound } from "next/navigation";
import { buscarRastreioPublico } from "@/lib/rastreio";
import { RastreioTimeline } from "@/components/shared/rastreio-timeline";

export default async function RastreioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rastreio = await buscarRastreioPublico(token);

  if (!rastreio) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <RastreioTimeline token={token} inicial={rastreio} />
    </div>
  );
}
