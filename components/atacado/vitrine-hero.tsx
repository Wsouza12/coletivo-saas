import Image from "next/image";

export function VitrineHero() {
  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 pt-4 pb-8 sm:pt-6">
      {/* Banner Container */}
      <div className="relative w-full overflow-hidden rounded-xl shadow-lg min-h-[220px] sm:min-h-0 sm:aspect-[21/6]">
        <Image
          src="/banner-atacado.jpg"
          alt="Ofertas de Atacado Coletivo"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay with text */}
        <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 to-transparent p-4 sm:p-8 md:p-16">
          <div className="max-w-xl text-white">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-2 sm:mb-4">
              COMPRAS COLETIVAS
            </h2>
            <p className="text-sm sm:text-xl font-medium opacity-90 mb-4 sm:mb-6 leading-snug">
              Os melhores preços direto dos fornecedores. Participe dos grupos e economize!
            </p>
            <span className="inline-flex items-center justify-center rounded-md bg-[#3483FA] px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2968c8]">
              Ver Ofertas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
