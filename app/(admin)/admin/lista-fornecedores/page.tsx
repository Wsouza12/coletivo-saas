import { ListaVendasPanel } from "@/components/admin/lista-vendas-panel";

export default function ListaFornecedoresVendasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Lista de Fornecedores — Vendas</h1>
        <p className="text-sm text-muted-foreground">
          Produto à parte (separado do Dropi e da compra coletiva). Quem comprou a lista, plano, valor e status.
          A landing pública fica em <a href="/fornecedores" className="text-primary underline" target="_blank">/fornecedores</a>.
        </p>
      </div>
      <ListaVendasPanel />
    </div>
  );
}
