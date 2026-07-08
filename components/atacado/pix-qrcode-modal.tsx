"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

// Modal de pagamento Pix — mostra o QR Code real gerado pelo Mercado Pago e
// faz polling no status até confirmar, sem precisar sair do site (em vez de
// redirecionar pro checkout hospedado do MP).
export function PixQrCodeModal({
  open,
  qrCode,
  qrCodeBase64,
  valor,
  checarStatus,
  onConfirmado,
  onClose,
}: {
  open: boolean;
  qrCode: string;
  qrCodeBase64: string;
  valor: number;
  checarStatus: () => Promise<boolean>;
  onConfirmado: () => void;
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(async () => {
      const confirmado = await checarStatus();
      if (confirmado) {
        clearInterval(interval);
        onConfirmado();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [open, checarStatus, onConfirmado]);

  async function copiar() {
    await navigator.clipboard.writeText(qrCode);
    setCopiado(true);
    toast.success("Código Pix copiado");
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pague {formatBRL(valor)} via Pix</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${qrCodeBase64}`}
            alt="QR Code Pix"
            className="size-56 rounded-lg border border-border"
          />
          <Button type="button" variant="outline" size="sm" onClick={copiar} className="w-full">
            {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copiado ? "Copiado" : "Copiar código Pix"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Abra o app do seu banco, escaneie o QR Code ou cole o código copiado. A confirmação é
            automática — essa tela atualiza sozinha assim que o pagamento cair.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
