import { AgendaPostagemPanel } from "@/components/admin/agenda-postagem-panel";

export default function AgendaPostagemPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Agenda de Postagem</h1>
        <p className="text-sm text-muted-foreground">
          Monte postagens de produto, comparação de preço ou mensagem livre e envie na hora ou agende pra 1–2 grupos do WhatsApp.
        </p>
      </div>
      <AgendaPostagemPanel />
    </div>
  );
}
