import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarket } from "@/hooks/use-market";

export function SiteHeader() {
  const { session } = useMarket();
  const isProvider = session.account?.kind === "profesional" || session.account?.kind === "empresa";
  const destination = isProvider
    ? session.account?.kind === "empresa"
      ? "/panel-empresa"
      : "/panel-profesional"
    : "/solicitud";
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link to="/" aria-label="Oficios, inicio" className="flex shrink-0 items-center gap-2">
          <span className="gradient-trust flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <Wrench className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Oficios</span>
        </Link>
        <nav aria-label="Acceso a servicios" className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/cuenta">{session.account ? "Mi cuenta" : "Ingresar"}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={destination}>{isProvider ? "Mi panel" : "Pedir un servicio"}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
