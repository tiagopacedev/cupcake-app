import Link from "next/link";
import { X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** SCR-05 unknown route (docs/04-ui-design-system.md §7.5). */
export default function NotFound() {
  return (
    <>
      <AppHeader variant="catalog" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-5 pb-6">
        <EmptyState icon={X} title="Página não encontrada" description="O link pode estar errado.">
          <Button asChild variant="outline" size="lg" className="h-12 border-input">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </EmptyState>
      </main>
    </>
  );
}
