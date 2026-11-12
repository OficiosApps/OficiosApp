import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ShieldAlert, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ActivityMetrics } from "@/components/activity-metrics";
import { IdentityReviewPanel } from "@/components/identity-verification";
import {
  ciudades,
  embudo,
  formatARS,
  metricasAdmin,
  profesionales,
  verificacionesPendientes,
} from "@/lib/mock-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración — métricas y verificaciones | Oficios" },
      {
        name: "description",
        content:
          "Panel interno del marketplace: solicitudes, contrataciones, embudo, verificaciones pendientes y ciudades configuradas.",
      },
      { property: "og:title", content: "Administración | Oficios" },
      { property: "og:description", content: "Métricas del piloto y control de verificaciones." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [pendientes, setPendientes] = useState(verificacionesPendientes);
  const maxEmbudo = embudo[0]!.valor;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">Administración</h1>
            <p className="mt-2 text-muted-foreground">Salud del piloto y operación diaria del marketplace.</p>
          </div>
          <span className="ml-auto rounded-full bg-secondary px-4 py-2 text-xs font-medium text-primary">
            Administrador · operación de ciudad
          </span>
        </div>


        <Tabs defaultValue="metricas" className="mt-10">
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            <TabsTrigger value="metricas">Actividad registrada</TabsTrigger>
            <TabsTrigger value="ejemplos">Datos de ejemplo</TabsTrigger>
            <TabsTrigger value="verificaciones">Verificaciones</TabsTrigger>
            <TabsTrigger value="identidades">DNI y selfie</TabsTrigger>
            <TabsTrigger value="profesionales">Profesionales</TabsTrigger>
            <TabsTrigger value="ciudades">Ciudades</TabsTrigger>
          </TabsList>

          <TabsContent value="identidades" className="mt-6"><IdentityReviewPanel /></TabsContent>
          <TabsContent value="metricas" className="mt-6"><ActivityMetrics /></TabsContent>
          <TabsContent value="ejemplos" className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="surface-panel p-6">
              <h2 className="font-display text-lg font-semibold">Embudo del circuito</h2>
              <ul className="mt-5 space-y-4">
                {embudo.map((e) => (
                  <li key={e.etapa}>
                    <div className="flex justify-between text-sm">
                      <span>{e.etapa}</span>
                      <span className="font-medium">{e.valor}</span>
                    </div>
                    <Progress value={(e.valor / maxEmbudo) * 100} className="mt-2" />
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-panel p-6">
              <h2 className="font-display text-lg font-semibold">Liquidez y servicio</h2>
              <dl className="mt-5 space-y-4 text-sm">
                {[
                  { k: "Tasa de respuesta de profesionales", v: `${Math.round(metricasAdmin.tasaRespuesta * 100)}%` },
                  { k: "Tiempo a primera respuesta", v: metricasAdmin.tiempoPrimeraRespuesta },
                  { k: "Profesionales activos", v: String(metricasAdmin.profesionalesActivos) },
                  { k: "Rating promedio", v: `${metricasAdmin.ratingPromedio} / 5` },
                ].map((r) => (
                  <div key={r.k} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0">
                    <dt className="text-muted-foreground">{r.k}</dt>
                    <dd className="font-display text-lg font-semibold">{r.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="verificaciones" className="mt-6">
            <div className="surface-panel overflow-x-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Profesional</TableHead>
                    <TableHead>Oficio</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendientes.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.id}</TableCell>
                      <TableCell>{v.profesional}</TableCell>
                      <TableCell>{v.oficio}</TableCell>
                      <TableCell>{v.documento}</TableCell>
                      <TableCell className="text-muted-foreground">{v.enviado}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setPendientes((prev) => prev.filter((p) => p.id !== v.id));
                              toast.success(`${v.profesional}: documento aprobado`);
                            }}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPendientes((prev) => prev.filter((p) => p.id !== v.id));
                              toast.info(`${v.profesional}: documento rechazado`);
                            }}
                          >
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendientes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No quedan verificaciones pendientes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="profesionales" className="mt-6">
            <div className="surface-panel overflow-x-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profesional</TableHead>
                    <TableHead>Oficio</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-right">Trabajos</TableHead>
                    <TableHead>Verificaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profesionales.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell>{p.oficio}</TableCell>
                      <TableCell>{p.barrio}</TableCell>
                      <TableCell className="text-right">{p.rating.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{p.trabajosCompletados}</TableCell>
                      <TableCell>{p.verificaciones.length} / 5</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="ciudades" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {ciudades.map((c) => (
                <div key={c.id} className="surface-panel p-5">
                  <p className="font-display text-lg font-semibold">{c.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.provincia}, {c.pais} · {c.moneda}
                  </p>
                  <span
                    className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                      c.activa ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {c.activa ? "Activa" : "Preparada, no lanzada"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Las ciudades son datos configurables: sumar una nueva no requiere cambios en la lógica del producto.
            </p>
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}
