"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  createdAt: string;
};

export function NotificacaoBell({ endpoint }: { endpoint: "lojista" | "admin" }) {
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregado, setCarregado] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const base = `/api/${endpoint}/notificacoes`;

  useEffect(() => {
    fetch(base)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setNotificacoes(json.data);
      })
      .catch(() => {})
      .finally(() => setCarregado(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  async function marcarLida(id: string) {
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    fetch(`${base}/${id}`, { method: "PATCH" }).catch(() => {});
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-muted-foreground hover:bg-muted"
        aria-label="Notificações"
      >
        <Bell className="size-5" />
        {naoLidas > 0 && (
          <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-border bg-card shadow-lg">
          <div className="border-b border-border px-3 py-2 text-sm font-medium">Notificações</div>
          <div className="max-h-96 overflow-auto">
            {!carregado && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
            {carregado && notificacoes.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
            )}
            {notificacoes.map((n) => {
              const conteudo = (
                <div
                  className={cn(
                    "flex flex-col gap-1 border-b border-border px-3 py-2 text-sm last:border-0",
                    !n.lida && "bg-primary/5"
                  )}
                >
                  <span className="font-medium text-foreground">{n.titulo}</span>
                  <span className="text-xs text-muted-foreground">{n.mensagem}</span>
                </div>
              );
              return (
                <button
                  key={n.id}
                  type="button"
                  className="block w-full text-left hover:bg-muted"
                  onClick={() => {
                    if (!n.lida) marcarLida(n.id);
                    if (!n.link) setOpen(false);
                  }}
                >
                  {n.link ? (
                    <Link href={n.link} onClick={() => setOpen(false)}>
                      {conteudo}
                    </Link>
                  ) : (
                    conteudo
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
