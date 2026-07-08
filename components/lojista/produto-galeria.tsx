"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Imagem = { id: string; url: string; alt: string | null };

export function ProdutoGaleria({ imagens, nome }: { imagens: Imagem[]; nome: string }) {
  const [ativa, setAtiva] = useState(imagens[0]);

  if (!ativa) {
    return <div className="aspect-square rounded-lg bg-muted" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image src={ativa.url} alt={ativa.alt ?? nome} fill className="object-cover" />
      </div>
      {imagens.length > 1 && (
        <div className="flex gap-2">
          {imagens.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setAtiva(img)}
              className={cn(
                "relative size-16 overflow-hidden rounded-md border-2",
                ativa.id === img.id ? "border-primary" : "border-transparent"
              )}
            >
              <Image src={img.url} alt={img.alt ?? nome} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
