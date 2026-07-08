"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pagination por cursor: "stack" guarda os cursors das páginas anteriores
// (separados por vírgula) para permitir voltar, já que cursor puro só anda para frente.
export function CursorPaginationControls({ nextCursor }: { nextCursor: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCursor = searchParams.get("cursor");
  const stack = searchParams.get("stack")?.split(",").filter(Boolean) ?? [];
  const hasPrev = stack.length > 0 || !!currentCursor;

  function goNext() {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    const newStack = currentCursor ? [...stack, currentCursor] : stack;
    params.set("cursor", nextCursor);
    if (newStack.length > 0) params.set("stack", newStack.join(","));
    router.push(`${pathname}?${params.toString()}`);
  }

  function goPrev() {
    const params = new URLSearchParams(searchParams.toString());
    const newStack = [...stack];
    const prevCursor = newStack.pop();
    if (prevCursor) {
      params.set("cursor", prevCursor);
      params.set("stack", newStack.join(","));
    } else {
      params.delete("cursor");
      params.delete("stack");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-3">
      <Button variant="outline" size="icon-sm" disabled={!hasPrev} onClick={goPrev}>
        <ChevronLeft className="size-4" />
      </Button>
      <Button variant="outline" size="icon-sm" disabled={!nextCursor} onClick={goNext}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
