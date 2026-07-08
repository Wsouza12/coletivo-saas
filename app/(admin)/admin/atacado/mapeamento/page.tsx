import { MapaCatalogoPanel } from "@/components/admin/mapa-catalogo-panel";

export default function MapaCatalogosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mapa de Catálogos</h1>
        <p className="text-sm text-muted-foreground">
          Arraste a foto do cliente ou busque por nome/código — resultado instantâneo de todos os catálogos mapeados.
        </p>
      </div>
      <MapaCatalogoPanel />
    </div>
  );
}
