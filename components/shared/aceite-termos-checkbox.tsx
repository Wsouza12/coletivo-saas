// Checkbox de "eu assumo a responsabilidade" reutilizável em qualquer ação
// manual que precise desse aceite explícito antes de confirmar.
export function AceiteTermosCheckbox({
  checked,
  onChange,
  texto,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  texto?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        {texto ??
          "Eu confirmo que essa informação está correta e assumo a responsabilidade por essa ação manual — a DropSync não se responsabiliza por erros decorrentes dela."}
      </span>
    </label>
  );
}
