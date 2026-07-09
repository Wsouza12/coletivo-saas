const fs = require('fs');

const path = 'components/admin/whatsapp-grupos-panel.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add Dialog imports if missing
if (!content.includes('DialogContent,')) {
  content = content.replace(
    'import { Textarea } from "@/components/ui/textarea";',
    `import { Textarea } from "@/components/ui/textarea";\nimport {\n  Dialog,\n  DialogContent,\n  DialogDescription,\n  DialogHeader,\n  DialogTitle,\n  DialogTrigger,\n} from "@/components/ui/dialog";`
  );
}

const targetFunctionStart = content.indexOf('function VincularGrupoControle({');
const nextFunctionStart = content.indexOf('function FixarTutorialButton', targetFunctionStart);

let newFunction = `function VincularGrupoControle({
  grupos,
  onVincular,
  onVincularManual,
}: {
  grupos: Grupo[];
  onVincular: (grupoId: string) => void;
  onVincularManual: (grupoId: string, grupoNome: string) => void;
}) {
  const [manual, setManual] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [grupoNome, setGrupoNome] = useState("");
  const [open, setOpen] = useState(false);

  const handleVincular = (id: string) => {
    onVincular(id);
    setOpen(false);
  };

  const handleVincularManual = () => {
    onVincularManual(grupoId, grupoNome);
    setGrupoId("");
    setGrupoNome("");
    setManual(false);
    setOpen(false);
  };

  const parentGroups = grupos.filter((g: any) => g.isCommunity);
  const childGroups = grupos.filter((g: any) => g.linkedParent);
  const standaloneGroups = grupos.filter((g: any) => !g.isCommunity && !g.linkedParent);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          <Link2 className="size-3 mr-1.5" />
          Vincular grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular Grupo do WhatsApp</DialogTitle>
          <DialogDescription>
            Selecione o grupo abaixo ou faça o vínculo manual se a Evolution API não estiver sincronizando.
          </DialogDescription>
        </DialogHeader>

        {manual || grupos.length === 0 ? (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs">JID do Grupo (ex: 123456789@g.us)</Label>
              <Input
                value={grupoId}
                onChange={(e) => setGrupoId(e.target.value)}
                placeholder="123456789@g.us"
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Nome de Exibição</Label>
              <Input
                value={grupoNome}
                onChange={(e) => setGrupoNome(e.target.value)}
                placeholder="Ex: Grupo Vip"
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {grupos.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setManual(false)}
                >
                  Voltar pra lista
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={!grupoId.trim() || !grupoNome.trim()}
                onClick={handleVincularManual}
              >
                Salvar Vínculo Manual
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {parentGroups.map((parent) => {
              const children = childGroups.filter((c: any) => c.linkedParent === parent.id);
              return (
                <div key={parent.id} className="flex flex-col gap-1 border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 border-b">
                    <span className="text-xs font-semibold text-primary">📁 Comunidade: {parent.nome}</span>
                  </div>
                  <div className="flex flex-col p-1">
                    <button
                      type="button"
                      onClick={() => handleVincular(parent.id)}
                      className="flex items-center text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      <span className="mr-2">📢</span> {parent.nome} (Avisos/Geral)
                    </button>
                    {children.map((child) => (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => handleVincular(child.id)}
                        className="flex items-center text-left pl-8 pr-3 py-2 text-sm hover:bg-muted rounded-md transition-colors text-muted-foreground"
                      >
                        ↳ <span className="ml-1.5 text-foreground">{child.nome} ({child.tamanho} membros)</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {standaloneGroups.length > 0 && (
              <div className="flex flex-col gap-1 border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 border-b">
                  <span className="text-xs font-semibold text-primary">
                    {parentGroups.length > 0 ? "Outros Grupos" : "Todos os Grupos"}
                  </span>
                </div>
                <div className="flex flex-col p-1">
                  {standaloneGroups.map((g) => (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => handleVincular(g.id)}
                      className="text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      {g.nome} <span className="text-xs text-muted-foreground ml-1">({g.tamanho} membros)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setManual(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                + vincular manualmente (JID)
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
`;

content = content.substring(0, targetFunctionStart) + newFunction + content.substring(nextFunctionStart);

fs.writeFileSync(path, content);
