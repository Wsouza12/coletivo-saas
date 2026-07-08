import Image from "next/image";

export function VitrineHero() {
  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 pt-4 pb-8 sm:pt-6">
      {/* Banner Container with aspect ratio */}
      <div className="relative w-full overflow-hidden rounded-xl shadow-lg" style={{ aspectRatio: "21/6" }}>
        <Image
          src="/banner-atacado.jpg"
          alt="Ofertas de Atacado Coletivo"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay with text if needed, but since we want it like ML we can just leave the image to shine. ML has text in the image. We can add a simple text overlay. */}
        <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 to-transparent p-8 md:p-16">
          <div className="max-w-xl text-white">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-4">
              COMPRAS COLETIVAS
            </h2>
            <p className="text-lg sm:text-xl font-medium opacity-90 mb-6">
              Os melhores preços direto dos fornecedores. Participe dos grupos e economize!
            </p>
            <span className="inline-flex items-center justify-center rounded-lg bg-[#3483FA] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2968c8]">
              Ver Ofertas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
