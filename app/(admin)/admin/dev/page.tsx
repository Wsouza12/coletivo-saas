import { KeyRound } from "lucide-react";
import { DevConfigPanel } from "@/components/admin/dev-config-panel";

export const dynamic = "force-dynamic";

export default function DevPanelPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><KeyRound className="size-5" /> Desenvolvedor</h1>
        <p className="text-sm text-muted-foreground">
          Configure as chaves de API deste cliente (white-label). O valor é salvo criptografado no
          banco e usado no lugar do <code>.env</code>. Deixe em branco pra manter o que já está.
        </p>
      </div>
      <DevConfigPanel />
    </div>
  );
}
