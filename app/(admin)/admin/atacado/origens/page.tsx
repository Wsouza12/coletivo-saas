import { OrigensPanel } from "@/components/admin/origens-panel";

export default function OrigensPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Origem dos Leads</h1>
        <p className="text-sm text-muted-foreground">
          Veja de onde vêm os cliques e as vendas — qual grupo, campanha ou canal converte mais.
        </p>
      </div>
      <OrigensPanel />
    </div>
  );
}
