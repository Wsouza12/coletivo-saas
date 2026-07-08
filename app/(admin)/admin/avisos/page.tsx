import { AvisosComposer } from "@/components/admin/avisos-composer";

export default function AdminAvisosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Avisos da Comunidade</h1>
        <p className="text-sm text-muted-foreground">
          Escreva um aviso (com ajuda da IA), anexe imagem/print/vídeo e dispare nos grupos.
        </p>
      </div>
      <AvisosComposer />
    </div>
  );
}
