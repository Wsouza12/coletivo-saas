"use client";

import { useState } from "react";
import { Eye, MessageSquareShare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatBRL } from "@/lib/format";

type Reserva = {
  id: string;
  quantidade: number;
  compradorNome: string;
  compradorDoc: string;
  compradorTelefone: string;
  valorTotal: string;
  metodoFrete: string;
  status: string;
  createdAt: string;
  mpQrCode: string | null;
  assinatura: { compradorEmail: string | null } | null;
};

export function RodadaDetalhesDialog({ rodadaId }: { rodadaId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enviandoPix, setEnviandoPix] = useState<string | null>(null);
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  async function abrir() {
    setOpen(true);
    if (reservas) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error("Erro ao carregar detalhes");
        return;
      }
      setReservas(json.data.reservas);
    } finally {
      setLoading(false);
    }
  }

  function enviarPix(r: any) {
    const telefone = r.compradorTelefone.replace(/\D/g, "");
    const numero = telefone.startsWith("55") ? telefone : `55${telefone}`;
    const texto = `🔔 *Lembrete de Pagamento*\nQuantidade: ${r.quantidade}un\n\nSua reserva na rodada de compra coletiva continua aguardando pagamento.\nCopie a chave PIX Copia e Cola abaixo para garantir sua cota:\n\n${r.mpQrCode}`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  }

  const pendentesCount = reservas?.filter((r) => r.status === "AGUARDANDO_PAGAMENTO").length ?? 0;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={abrir}>
        <Eye className="size-3.5" />
        Detalhes
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl sm:max-h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between mt-2 pr-6">
            <DialogTitle>Compradores dessa caixa</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
              🖨️ Imprimir Docs
            </Button>
          </DialogHeader>

          {reservas && pendentesCount > 0 && (
            <div className="rounded-md bg-warning/20 p-3 text-sm text-warning-foreground">
              Há <strong>{pendentesCount}</strong> pessoa(s) com pagamento pendente nesta caixa.
            </div>
          )}

          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : !reservas || reservas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma reserva ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {reservas.map((r) => (
                <div key={r.id} className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{r.compradorNome}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.compradorDoc} — {r.compradorTelefone}
                    {r.assinatura?.compradorEmail ? ` — ${r.assinatura.compradorEmail}` : ""}
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span>{r.quantidade} unidade(s) — {r.metodoFrete}</span>
                    <span className="font-medium text-primary">{formatBRL(Number(r.valorTotal))}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(r.createdAt).toLocaleString("pt-BR")}</span>
                    {r.status === "AGUARDANDO_PAGAMENTO" && r.mpQrCode && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => enviarPix(r)}
                      >
                        <MessageSquareShare className="mr-1.5 size-3" />
                        Enviar PIX Wpp
                      </Button>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="w-full max-w-4xl h-[90vh] flex flex-col p-4">
          <DialogHeader className="flex flex-row items-center justify-between pr-6 border-b pb-2">
            <DialogTitle>Preview de Impressão</DialogTitle>
            <Button onClick={() => {
              const iframe = document.getElementById(`print-frame-${rodadaId}`) as HTMLIFrameElement;
              iframe?.contentWindow?.print();
            }}>
              🖨️ Imprimir Agora
            </Button>
          </DialogHeader>
          <div className="flex-1 w-full relative bg-gray-100 rounded-md overflow-hidden">
            {printOpen && (
              <iframe 
                id={`print-frame-${rodadaId}`}
                src={`/admin/atacado/imprimir/${rodadaId}`} 
                className="w-full h-full border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
