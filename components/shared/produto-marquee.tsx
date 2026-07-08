import Image from "next/image";

type Produto = {
  id: string;
  nome: string;
  imagens: { url: string; alt: string | null }[];
};

// Faixa de produtos rolando infinitamente — CSS puro, sem JS no cliente.
// Duplicamos a lista uma vez pra criar o loop contínuo (translateX -50%).
export function ProdutoMarquee({ produtos }: { produtos: Produto[] }) {
  if (produtos.length === 0) return null;
  const faixa = [...produtos, ...produtos];

  return (
    <div className="relative mt-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent" />
      <div className="flex w-max animate-marquee gap-4">
        {faixa.map((produto, i) => (
          <div
            key={`${produto.id}-${i}`}
            className="relative size-28 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
          >
            {produto.imagens[0] && (
              <Image
                src={produto.imagens[0].url}
                alt={produto.imagens[0].alt ?? produto.nome}
                fill
                className="object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
