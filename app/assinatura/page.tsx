"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mascararCpfCnpj, mascararTelefone } from "@/lib/format";
import { PixQrCodeModal } from "@/components/atacado/pix-qrcode-modal";
import { APP_NAME } from "@/lib/brand";
import { CheckCircle2 } from "lucide-react";

export default function AssinaturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [telefone, setTelefone] = useState("");

  const [pix, setPix] = useState<{ qrCode: string; qrCodeBase64: string; valor: number; tipo: "assinatura" } | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function assinar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || doc.replace(/\D/g, "").length < 11 || telefone.replace(/\D/g, "").length < 10) {
      toast.error("Preencha todos os dados de contato corretamente.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/atacado/assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          compradorNome: nome, 
          compradorDoc: doc.trim(), 
          compradorEmail: "sem-email@dropsync.com.br", 
          compradorTelefone: telefone 
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao iniciar assinatura");
        return;
      }
      if (json.data?.qrCode && json.data?.qrCodeBase64) {
        setPix({ qrCode: json.data.qrCode, qrCodeBase64: json.data.qrCodeBase64, valor: json.data.valor, tipo: "assinatura" });
      } else {
        toast.error("Mercado Pago não configurado — não foi possível gerar o Pix");
      }
    } catch (err) {
      toast.error("Erro interno. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const checarStatusPix = useCallback(async (): Promise<boolean> => {
    if (!pix) return false;
    const res = await fetch(`/api/atacado/assinatura?doc=${encodeURIComponent(doc.replace(/\D/g, ""))}`);
    const json = await res.json();
    return Boolean(json.data?.ativa);
  }, [pix, doc]);

  function handlePixConfirmado() {
    setPix(null);
    setSucesso(true);
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-xl overflow-hidden border border-border">
        <div className="bg-primary p-6 text-center text-primary-foreground">
          <img src="/icon.png" alt="Logo" className="w-12 h-12 mx-auto mb-3 object-contain filter brightness-0 invert" />
          <h1 className="text-2xl font-bold">Clube VIP {APP_NAME}</h1>
          <p className="opacity-90 mt-1 text-sm">Assine agora para garantir os melhores preços de atacado direto da fábrica.</p>
        </div>

        <div className="p-6">
          {sucesso ? (
            <div className="text-center py-8 animate-in zoom-in duration-500">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Assinatura Ativa!</h2>
              <p className="text-muted-foreground mb-6">
                Parabéns, {nome.split(" ")[0]}! Seu CPF/CNPJ já foi ativado e o desconto VIP será aplicado automaticamente em suas compras.
              </p>
              <Button onClick={() => router.push("/")} className="w-full" size="lg">
                Ir para Vitrine
              </Button>
            </div>
          ) : (
            <form onSubmit={assinar} className="space-y-4">
              <div className="space-y-1">
                <Label>Nome Completo</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João Silva" required />
              </div>
              
              <div className="space-y-1">
                <Label>CPF ou CNPJ</Label>
                <Input value={doc} onChange={(e) => setDoc(mascararCpfCnpj(e.target.value))} placeholder="000.000.000-00" maxLength={18} required />
              </div>
              
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  required
                />
              </div>

              <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg text-sm text-primary mt-4">
                🔒 Assinatura com cobrança via Pix Mercado Pago. Renovação mensal sem surpresas no cartão de crédito.
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2 font-bold bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                {loading ? "Processando..." : "Gerar PIX e Assinar"}
              </Button>
            </form>
          )}
        </div>
      </div>

      <PixQrCodeModal
        open={!!pix}
        onClose={() => setPix(null)}
        qrCode={pix?.qrCode ?? ""}
        qrCodeBase64={pix?.qrCodeBase64 ?? ""}
        valor={pix?.valor ?? 0}
        onConfirmado={handlePixConfirmado}
        checarStatus={checarStatusPix}
      />
    </div>
  );
}
