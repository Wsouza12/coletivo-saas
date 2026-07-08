export function formatBRL(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Máscara (XX) XXXXX-XXXX enquanto digita — sistema é só Brasil, então o DDI 55
// é assumido implicitamente aqui e em lib/evolution.ts (não aparece pro usuário
// digitar, só o DDD+número).
export function mascararTelefone(valor: string): string {
  if (!valor) return "";
  const v = valor.replace(/\D/g, "");
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

export function mascararCpfCnpj(valor: string): string {
  if (!valor) return "";
  const v = valor.replace(/\D/g, "");
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function mascararCep(valor: string): string {
  if (!valor) return "";
  const v = valor.replace(/\D/g, "");
  return v.replace(/(\d{5})(\d{3})/, "$1-$2");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
