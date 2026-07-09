const fs = require('fs');

const path = 'components/admin/whatsapp-grupos-panel.tsx';
let content = fs.readFileSync(path, 'utf8');

// Need to import SelectGroup and SelectLabel at the top if they are not imported
if (!content.includes('SelectGroup,')) {
  content = content.replace(
    '  SelectValue,\n} from "@/components/ui/select";',
    '  SelectValue,\n  SelectGroup,\n  SelectLabel,\n} from "@/components/ui/select";'
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

  if (manual || grupos.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-1">
          <Input
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            placeholder="JID (ex: 123456789@g.us)"
            className="h-8 flex-1 text-xs"
          />
          <Input
            value={grupoNome}
            onChange={(e) => setGrupoNome(e.target.value)}
            placeholder="Nome do grupo"
            className="h-8 flex-1 text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={!grupoId.trim() || !grupoNome.trim()}
            onClick={() => {
              onVincularManual(grupoId, grupoNome);
              setGrupoId("");
              setGrupoNome("");
            }}
          >
            <Plus className="size-3" />
          </Button>
        </div>
        {grupos.length > 0 ? (
          <button
            type="button"
            onClick={() => setManual(false)}
            className="self-start text-[10px] text-primary hover:underline"
          >
            ← usar lista da Evolution
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            Evolution sem grupos visíveis — vincula manual com o JID que aparece no link de convite.
          </span>
        )}
      </div>
    );
  }

  const parentGroups = grupos.filter((g: any) => g.isCommunity);
  const childGroups = grupos.filter((g: any) => g.linkedParent);
  const standaloneGroups = grupos.filter((g: any) => !g.isCommunity && !g.linkedParent);

  return (
    <div className="flex flex-col gap-1">
      <Select onValueChange={(id) => onVincular(id)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Vincular grupo..." />
        </SelectTrigger>
        <SelectContent>
          {parentGroups.map(parent => {
            const children = childGroups.filter((c: any) => c.linkedParent === parent.id);
            return (
              <SelectGroup key={parent.id}>
                <SelectLabel className="font-bold text-primary px-2 py-1.5 text-xs bg-muted/30">
                  📁 Comunidade: {parent.nome}
                </SelectLabel>
                <SelectItem value={parent.id} className="pl-6">
                  📢 {parent.nome} (Avisos/Geral)
                </SelectItem>
                {children.map(child => (
                  <SelectItem key={child.id} value={child.id} className="pl-6">
                    ↳ {child.nome} ({child.tamanho} membros)
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
          
          {standaloneGroups.length > 0 && (
            <SelectGroup>
              <SelectLabel className="font-bold text-primary px-2 py-1.5 text-xs bg-muted/30">
                {parentGroups.length > 0 ? "Outros Grupos" : "Todos os Grupos"}
              </SelectLabel>
              {standaloneGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nome} ({g.tamanho} membros)
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={() => setManual(true)}
        className="w-fit text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        + vincular manualmente (JID)
      </button>
    </div>
  );
}
`;

content = content.substring(0, targetFunctionStart) + newFunction + content.substring(nextFunctionStart);

fs.writeFileSync(path, content);
