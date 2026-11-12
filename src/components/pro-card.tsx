import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, MapPin, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { etiquetaEstado, formatARS, type Profesional } from "@/lib/mock-data";

const estadoDot: Record<Profesional["estado"], string> = {
  disponible: "bg-success",
  ocupado: "bg-warning",
  "fuera-de-horario": "bg-muted-foreground",
};

export function ProCard({ pro }: { pro: Profesional }) {
  return (
    <article className="surface-panel flex flex-col gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start gap-4">
        <span className="gradient-trust flex size-12 shrink-0 items-center justify-center rounded-xl font-display text-sm font-semibold text-primary-foreground">
          {pro.iniciales}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-semibold">{pro.nombre}</h3>
            {pro.verificaciones.includes("matricula") && (
              <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Matrícula verificada" />
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">{pro.oficio}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="size-3.5 fill-accent text-accent" />
              {pro.rating.toFixed(1)}
              <span className="font-normal text-muted-foreground">({pro.reseñas})</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {pro.distanciaKm} km · {pro.barrio}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> responde en ~{pro.respuestaMin} min
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
          <span className={`size-1.5 rounded-full ${estadoDot[pro.estado]}`} />
          {etiquetaEstado[pro.estado]}
        </span>
        {pro.urgencias && (
          <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 font-medium text-accent-foreground">
            <Zap className="size-3" /> Urgencias
          </span>
        )}
        <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
          {pro.trabajosCompletados} trabajos
        </span>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{pro.descripcion}</p>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="text-sm">
          <p className="font-semibold">{formatARS(pro.precioHora)}/h</p>
          <p className="text-xs text-muted-foreground">
            {pro.precioVisita > 0 ? `Visita ${formatARS(pro.precioVisita)}` : "Presupuesto sin cargo"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/profesionales/$id" params={{ id: pro.id }}>
              Ver perfil
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/solicitud" search={{ categoria: pro.categorias[0]! }}>
              Pedir presupuesto
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
