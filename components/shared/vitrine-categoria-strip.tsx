"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  Layers,
  Boxes,
  PawPrint,
  Home,
  Zap,
  Shirt,
  Dumbbell,
  Sparkles,
  Pencil,
  Apple,
  Baby,
  Wrench,
  Car,
  BookOpen,
  Gem,
  Flower2,
  HeartPulse,
  Gamepad2,
  Smartphone,
  Sofa,
  ChevronLeft,
  ChevronRight,
  Camera,
  Tv,
  Gift,
  Factory,
  Laptop,
  Music,
  Tractor,
  type LucideIcon,
} from "lucide-react";

const MAPA_ICONES: Record<string, LucideIcon> = {
  "acessorios para veiculos": Car,
  "agro": Tractor,
  "alimentos e bebidas": Apple,
  "animais": PawPrint,
  "antiguidades e colecoes": Gem,
  "arte, papelaria e armarinho": Pencil,
  "bebes": Baby,
  "beleza e cuidado pessoal": Sparkles,
  "brinquedos e hobbies": Gamepad2,
  "calcados, roupas e bolsas": Shirt,
  "cameras e acessorios": Camera,
  "carros, motos e outros": Car,
  "casa, moveis e decoracao": Sofa,
  "celulares e telefones": Smartphone,
  "construcao": Wrench,
  "eletrodomesticos": Zap,
  "eletronicos, audio e video": Tv,
  "esportes e fitness": Dumbbell,
  "ferramentas": Wrench,
  "festas e lembrancinhas": Gift,
  "games": Gamepad2,
  "industria e comercio": Factory,
  "informatica": Laptop,
  "instrumentos musicais": Music,
  "joias e relogios": Gem,
  "livros, revistas e comics": BookOpen,
  "musica, filmes e seriados": Tv,
  "saude": HeartPulse,
  "outros": Boxes,
};

const DIACRITICOS = /[̀-ͯ]/g;

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(DIACRITICOS, "").trim();
}

function iconeParaCategoria(nome: string): LucideIcon {
  const normalizado = normalizar(nome);
  return MAPA_ICONES[normalizado] || Boxes;
}

// Convenção pra subcategorias: "Pai › Filha" (separador U+203A com espaços).
// Ex: "Casa › Cozinha", "Casa › Banheiro". Quem digita só "Casa" é pai puro.
// A strip mostra só os pais; as filhas vão num componente separado (sidebar).
export const SEP_CATEGORIA = " › ";

export function splitCategoria(nome: string): { pai: string; filha: string | null } {
  const i = nome.indexOf(SEP_CATEGORIA);
  if (i < 0) return { pai: nome.trim(), filha: null };
  return { pai: nome.slice(0, i).trim(), filha: nome.slice(i + SEP_CATEGORIA.length).trim() };
}

// Helper exportado pra a página derivar grupos pai+filhas a partir do
// groupBy(categoria) puro do Prisma.
export function agruparCategorias(
  categorias: { nome: string; total: number }[]
): { nome: string; total: number; filhas: { nome: string; total: number }[] }[] {
  const grupos = new Map<string, { total: number; filhas: { nome: string; total: number }[] }>();
  for (const c of categorias) {
    const { pai, filha } = splitCategoria(c.nome);
    const g = grupos.get(pai) ?? { total: 0, filhas: [] };
    g.total += c.total;
    if (filha) g.filhas.push({ nome: filha, total: c.total });
    grupos.set(pai, g);
  }
  return Array.from(grupos.entries())
    .map(([nome, g]) => ({ nome, total: g.total, filhas: g.filhas }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

// Strip horizontal scrollável (uma linha só) com setas pra navegar lateralmente,
// estilo Mercado Livre / Ifood. Mobile usa swipe nativo; desktop ganha as setas.
export function VitrineCategoriaStrip({
  categorias,
  categoriaAtiva,
  basePath = "/",
}: {
  categorias: { nome: string; total: number }[];
  categoriaAtiva?: string;
  basePath?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function rolar(direcao: "esq" | "dir") {
    const el = scrollRef.current;
    if (!el) return;
    const passo = Math.round(el.clientWidth * 0.7);
    el.scrollBy({ left: direcao === "esq" ? -passo : passo, behavior: "smooth" });
  }

  const pais = agruparCategorias(categorias);
  const ativaPai = categoriaAtiva ? splitCategoria(categoriaAtiva).pai : undefined;

  function linkCategoria(nome: string | null) {
    if (!nome) return basePath;
    return `${basePath}?categoria=${encodeURIComponent(nome)}`;
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Categorias anteriores"
        onClick={() => rolar("esq")}
        className="absolute left-0 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-muted sm:flex"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Próximas categorias"
        onClick={() => rolar("dir")}
        className="absolute right-0 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-muted sm:flex"
      >
        <ChevronRight className="size-4" />
      </button>

      <div
        ref={scrollRef}
        className="scrollbar-none flex gap-3 overflow-x-auto scroll-smooth px-1 pb-4 pt-2 sm:gap-4 sm:px-10"
        style={{ scrollbarWidth: "none" }}
      >
        <Link
          href={basePath}
          className="group flex w-16 flex-none flex-col items-center gap-2 text-center sm:w-20"
        >
          <span
            className={`flex size-14 items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-105 sm:size-16 ${
              !categoriaAtiva ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground group-hover:border-primary group-hover:text-primary"
            }`}
          >
            <Layers className="size-6 sm:size-7" />
          </span>
          <span className="line-clamp-2 text-[10px] leading-tight font-medium text-foreground sm:text-xs">
            Todos
          </span>
        </Link>
        {pais.map((p) => {
          const Icone = iconeParaCategoria(p.nome);
          const ativo = ativaPai === p.nome;
          return (
            <Link
              key={p.nome}
              href={linkCategoria(p.nome)}
              className="group flex w-16 flex-none flex-col items-center gap-2 text-center sm:w-20"
            >
              <span
                className={`relative flex size-14 items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-105 sm:size-16 ${
                  ativo ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground group-hover:border-primary group-hover:text-primary"
                }`}
              >
                <Icone className="size-6 sm:size-7" />
                {p.filhas.length > 0 ? (
                  <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-bold text-primary-foreground">
                    {p.filhas.length + 1}
                  </span>
                ) : null}
              </span>
              <span className="line-clamp-2 text-[10px] leading-tight font-medium text-foreground sm:text-xs">
                {p.nome}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Sidebar/painel de subcategorias do PAI ativo. Aparece ao lado do grid no
// desktop e como faixa horizontal de pílulas no mobile.
export function VitrineSubcategoriasSidebar({
  categorias,
  categoriaAtiva,
  basePath = "/",
}: {
  categorias: { nome: string; total: number }[];
  categoriaAtiva?: string;
  basePath?: string;
}) {
  if (!categoriaAtiva) return null;
  const { pai } = splitCategoria(categoriaAtiva);
  const pais = agruparCategorias(categorias);
  const grupo = pais.find((p) => p.nome === pai);
  if (!grupo || grupo.filhas.length === 0) return null;

  function linkCategoria(nome: string) {
    return `${basePath}?categoria=${encodeURIComponent(nome)}`;
  }

  return (
    <aside className="rounded-xl border border-border bg-card p-3">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {pai}
      </span>
      <nav className="mt-2 flex flex-col gap-1">
        <Link
          href={linkCategoria(grupo.nome)}
          className={`rounded-md px-2 py-1.5 text-sm font-medium transition ${
            categoriaAtiva === grupo.nome
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted"
          }`}
        >
          Tudo de {grupo.nome}
        </Link>
        {grupo.filhas.map((f) => {
          const valor = `${grupo.nome}${SEP_CATEGORIA}${f.nome}`;
          return (
            <Link
              key={f.nome}
              href={linkCategoria(valor)}
              className={`rounded-md px-2 py-1.5 text-sm transition ${
                categoriaAtiva === valor
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {f.nome}{" "}
              <span className="text-xs text-muted-foreground">({f.total})</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
