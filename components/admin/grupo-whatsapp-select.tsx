"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

export type GrupoWhatsappOption = {
  categoria: string;
  grupoId: string;
  grupoNome: string;
  linkConvite?: string | null;
};

export function GrupoWhatsappSelect({
  value,
  onChange,
  grupos,
  label,
  placeholder = "Selecionar grupo...",
}: {
  value: string;
  onChange: (val: string) => void;
  grupos: GrupoWhatsappOption[];
  label: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const selecionado = grupos.find((g) => g.grupoId === value);
  const textoBotao = value === "none" ? "Não enviar" : (selecionado ? `${selecionado.grupoNome} (${selecionado.categoria})` : placeholder);

  const filtrados = grupos.filter(g => 
    g.grupoNome.toLowerCase().includes(busca.toLowerCase()) || 
    g.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">{label}</label>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-sm"
          onClick={() => setOpen(true)}
        >
          <span className="truncate">{textoBotao}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>Selecione um grupo para {label}</DialogTitle>
            <DialogDescription>
              Pesquise e selecione o grupo de WhatsApp desejado na lista abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar grupo ou categoria..."
                className="pl-8 text-sm"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="px-6 pb-6 pt-2 flex flex-col gap-2 overflow-y-auto">
            <button
              type="button"
              className={`flex items-center text-left px-3 py-3 text-sm hover:bg-muted rounded-md transition-colors ${value === "none" ? "bg-muted font-semibold" : ""}`}
              onClick={() => {
                onChange("none");
                setOpen(false);
              }}
            >
              <span className="flex-1">Não enviar</span>
              {value === "none" && <Check className="h-4 w-4 text-primary" />}
            </button>
            {filtrados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum grupo encontrado.</p>
            ) : (
              filtrados.map((g) => (
                <button
                  type="button"
                  key={g.grupoId}
                  className={`flex items-center text-left px-3 py-3 text-sm hover:bg-muted rounded-md transition-colors ${value === g.grupoId ? "bg-muted font-semibold" : ""}`}
                  onClick={() => {
                    onChange(g.grupoId);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">
                    {g.grupoNome} <span className="text-muted-foreground ml-1 text-[11px] font-normal">({g.categoria})</span>
                  </span>
                  {value === g.grupoId && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
