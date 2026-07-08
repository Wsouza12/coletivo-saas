"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PublicarPanel } from "@/components/lojista/publicar-panel";

type Anuncio = { id: string; plataforma: string; status: string; url: string | null };

export function PublicarRapidoDialog({
  produtoId,
  nomeProduto,
  precoAtacado,
  semEstoque,
  plataformasConectadas,
  anunciosExistentes,
  labelBotao = "Publicar",
}: {
  produtoId: string;
  nomeProduto: string;
  precoAtacado: number;
  semEstoque: boolean;
  plataformasConectadas: string[];
  anunciosExistentes: Anuncio[];
  labelBotao?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        className="w-full"
        disabled={semEstoque}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {labelBotao}
      </Button>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Publicar produto</DialogTitle>
        </DialogHeader>
        <PublicarPanel
          produtoId={produtoId}
          nomeProduto={nomeProduto}
          precoAtacado={precoAtacado}
          semEstoque={semEstoque}
          plataformasConectadas={plataformasConectadas}
          anunciosExistentes={anunciosExistentes}
        />
      </DialogContent>
    </Dialog>
  );
}
