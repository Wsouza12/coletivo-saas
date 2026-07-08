import { ProdutoForm } from "@/components/admin/produto-form";

export default function NovoProdutoPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Novo Produto</h1>
      <ProdutoForm />
    </div>
  );
}
