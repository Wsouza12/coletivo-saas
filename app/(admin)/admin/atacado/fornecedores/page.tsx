import { FornecedoresAtacadoPanel } from "@/components/admin/fornecedores-atacado-dialog";
import { TodosCatalogosPanel } from "@/components/admin/todos-catalogos-panel";
import { CatalogosDivulgacaoPanel } from "@/components/admin/catalogos-divulgacao-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminFornecedoresPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Fornecedores (uso interno)</h1>
        <p className="text-sm text-muted-foreground">
          Cadastro privado dos seus fornecedores e catálogos em PDF — nunca aparece em página pública.
        </p>
      </div>
      <Tabs defaultValue="fornecedores" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="catalogos">Todos os Catálogos</TabsTrigger>
          <TabsTrigger value="divulgacao">Divulgar Catálogos</TabsTrigger>
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
