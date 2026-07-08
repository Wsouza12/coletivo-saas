"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = { chave: string; origem: "banco" | "env" | "faltando" };

// Agrupamento visual das chaves
// Só chaves de RUNTIME (server-side) — editáveis pelo painel.
// NEXT_PUBLIC_* são build-time (inlinadas), ficam no .env da Vercel.
const GRUPOS: { titulo: string; chaves: string[] }[] = [
  { titulo: "IA", chaves: ["GROQ_API_KEY", "JINA_API_KEY"] },
  { titulo: "Pagamento (Mercado Pago)", chaves: ["MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"] },
  { titulo: "WhatsApp (Evolution)", chaves: ["EVOLUTION_API_URL", "EVOLUTION_INSTANCE", "EVOLUTION_API_KEY"] },
  { titulo: "Storage (Supabase)", chaves: ["SUPABASE_SERVICE_KEY"] },
  { titulo: "Catálogos (Cloudflare R2)", chaves: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_CATALOGOS", "R2_ENDPOINT", "R2_PUBLIC_URL_CATALOGOS"] },
  { titulo: "Frete (Melhor Envio)", chaves: ["MELHOR_ENVIO_TOKEN"] },
  { titulo: "E-mail (Resend)", chaves: ["RESEND_API_KEY"] },
];

const cor: Record<Status["origem"], string> = {
  banco: "text-emerald-600", env: "text-blue-600", faltando: "text-amber-500",
};
const rotulo: Record<Status["origem"], string> = {
  banco: "salva no painel", env: "no .env", faltando: "faltando",
};

export function DevConfigPanel() {
  const [status, setStatus] = useState<Record<string, Status["origem"]>>({});
  const [valores, setValores] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  function carregar() {
    fetch("/api/admin/dev/config").then((r) => r.json()).then((j) => {
      const m: Record<string, Status["origem"]> = {};
      (j.data?.status ?? []).forEach((s: Status) => { m[s.chave] = s.origem; });
      setStatus(m);
    }).catch(() => toast.error("Erro ao carregar"));
  }
  useEffect(carregar, []);

  async function salvar(chave: string) {
    const valor = (valores[chave] ?? "").trim();
    if (!valor) return toast.error("Cole o valor antes de salvar");
    setSalvando(chave);
    try {
      const r = await fetch("/api/admin/dev/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave, valor }),
      });
      const j = await r.json();
      if (!r.ok) { toast.error(j.error?.message ?? "Erro ao salvar"); return; }
      toast.success(`${chave} salva`);
      setValores((v) => ({ ...v, [chave]: "" }));
      carregar();
    } finally { setSalvando(null); }
  }

  return (
    <div className="flex flex-col gap-5">
      {GRUPOS.map((g) => (
        <div key={g.titulo} className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">{g.titulo}</h2>
          <div className="flex flex-col gap-3">
            {g.chaves.map((chave) => (
              <div key={chave} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <code className="text-xs text-muted-foreground">{chave}</code>
                  <span className={`text-xs ${cor[status[chave] ?? "faltando"]}`}>{rotulo[status[chave] ?? "faltando"]}</span>
                </div>
                <div className="flex gap-2">
                  <Input type="password" placeholder="colar novo valor…" value={valores[chave] ?? ""}
                    onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))} className="h-8 text-xs" />
                  <Button size="sm" className="h-8" disabled={salvando === chave} onClick={() => salvar(chave)}>
                    {salvando === chave ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-xs text-muted-foreground flex flex-col gap-1">
        <p className="flex items-center gap-1 font-medium text-foreground"><KeyRound className="size-3.5" /> Ficam no .env da Vercel (não editável aqui)</p>
        <p>Bootstrap: <code>DATABASE_URL</code>, <code>NEXTAUTH_SECRET</code>, <code>ML_ENCRYPTION_KEY</code>, <code>CRON_SECRET</code></p>
        <p>Build-time (marca/URLs públicas): <code>NEXT_PUBLIC_APP_NAME</code>, <code>NEXT_PUBLIC_APP_URL</code>, <code>NEXT_PUBLIC_SUPABASE_URL</code></p>
        <p className="mt-1">As chaves acima são salvas <b>criptografadas</b> (AES-256-GCM) e aplicadas no próximo restart do servidor.</p>
      </div>
    </div>
  );
}
