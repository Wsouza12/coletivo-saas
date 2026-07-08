import { FornecedoresAtacadoPanel } from "@/components/admin/fornecedores-atacado-dialog";
import { TodosCatalogosPanel } from "@/components/admin/todos-catalogos-panel";
import { CatalogosDivulgacaoPanel } from "@/components/admin/catalogos-divulgacao-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminFornecedoresPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Catálogos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogos em PDF para cadastro de produtos.
        </p>
      </div>
      <Tabs defaultValue="fornecedores" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="fornecedores">Cadastro por páginas</TabsTrigger>
          <TabsTrigger value="catalogos">Cadastro por produto</TabsTrigger>
          <TabsTrigger value="divulgacao">Envio de catálogo</TabsTrigger>
        </TabsList>
        <TabsContent value="fornecedores">
          <FornecedoresAtacadoPanel />
        </TabsContent>
        <TabsContent value="catalogos">
          <TodosCatalogosPanel />
        </TabsContent>
        <TabsContent value="divulgacao">
          <CatalogosDivulgacaoPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
