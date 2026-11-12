import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crown,
  ShieldCheck,
  Sliders,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ActivityMetrics } from "@/components/activity-metrics";
import {
  auditoria,
  ciudades,
  configComercial,
  equipoPlataforma,
  etiquetaRol,
  featureFlags,
  formatARS,
  incidentesAbiertos,
  liquidezPorCiudad,
  metricasSuperadmin,
  saludSistema,
} from "@/lib/mock-data";

export const Route = createFileRoute("/superadmin")({
  head: () => ({
    meta: [
      { title: "Superadmin — control global de la plataforma | Oficios" },
      {
        name: "description",
        content:
          "Control global del marketplace: ciudades, equipo y roles, comisiones, feature flags, auditoría y salud del sistema.",
      },
      { property: "og:title", content: "Superadmin | Oficios" },
      { property: "og:description", content: "Control global de ciudades, roles, comisiones y auditoría." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Superadmin,
});

function Superadmin() {
  const [flags, setFlags] = useState(featureFlags);
  const [ciudadesState, setCiudadesState] = useState(ciudades);
  const [equipo, setEquipo] = useState(equipoPlataforma);
  const [config, setConfig] = useState(configComercial);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="gradient-trust flex size-10 items-center justify-center rounded-xl text-primary-foreground">
            <Crown className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">Superadmin</h1>
            <p className="text-muted-foreground">
              Control global de la plataforma, por encima de la operación diaria de cada ciudad.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link to="/admin">Ir a Administración</Link>
          </Button>
        </div>

        <Tabs defaultValue="actividad" className="mt-10">
          <TabsList className="flex-wrap">
            <TabsTrigger value="actividad">Actividad registrada</TabsTrigger>
            <TabsTrigger value="equipo">Equipo y roles</TabsTrigger>
            <TabsTrigger value="ciudades">Ciudades</TabsTrigger>
            <TabsTrigger value="liquidez">Liquidez</TabsTrigger>
            <TabsTrigger value="comercial">Comisiones</TabsTrigger>
            <TabsTrigger value="flags">Feature flags</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
            <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="actividad" className="mt-6"><ActivityMetrics /></TabsContent>
          <TabsContent value="equipo" className="mt-6">
            <div className="surface-panel mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <h2 className="font-semibold">Incorporá administradores a tu equipo</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los superadministradores dan de alta a los administradores. Las altas de superadministradores corresponden a los CEOs.
                </p>
              </div>
              <Button asChild>
                <Link to="/equipo" search={{ vista: "superadmin", invitacion: "" }}>Probar alta de administrador</Link>
              </Button>
            </div>
            <div className="surface-panel overflow-x-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipo.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium">{u.nombre}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell>{etiquetaRol[u.rol]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.ciudadId === "todas"
                          ? "Todas las ciudades"
                          : (ciudadesState.find((c) => c.id === u.ciudadId)?.nombre ?? u.ciudadId)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.ultimoAcceso}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            u.estado === "activo" ? "default" : u.estado === "invitado" ? "secondary" : "destructive"
                          }
                        >
                          {u.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={u.rol === "superadmin"}
                          onClick={() => {
                            const nuevo = u.estado === "suspendido" ? "activo" : "suspendido";
                            setEquipo((prev) =>
                              prev.map((p) => (p.id === u.id ? { ...p, estado: nuevo as typeof p.estado } : p)),
                            );
                            toast.success(`${u.nombre}: ${nuevo === "activo" ? "acceso restablecido" : "acceso suspendido"}`);
                          }}
                        >
                          {u.estado === "suspendido" ? "Reactivar" : "Suspender"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Los roles son de plataforma: un admin de ciudad sólo ve la operación de su ciudad; el superadmin ve todo.
            </p>
          </TabsContent>

          <TabsContent value="ciudades" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ciudadesState.map((c) => (
                <div key={c.id} className="surface-panel p-5">
                  <p className="font-display text-lg font-semibold">{c.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.provincia}, {c.pais} · {c.moneda}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Label htmlFor={`ciudad-${c.id}`} className="text-sm">
                      {c.activa ? "Operando" : "Preparada, no lanzada"}
                    </Label>
                    <Switch
                      id={`ciudad-${c.id}`}
                      checked={c.activa}
                      onCheckedChange={(v) => {
                        setCiudadesState((prev) => prev.map((x) => (x.id === c.id ? { ...x, activa: v } : x)));
                        toast.info(`${c.nombre}: ${v ? "ciudad activada" : "ciudad pausada"}`);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Activar una ciudad no requiere cambios de código: es un registro configurable más.
            </p>
          </TabsContent>

          <TabsContent value="liquidez" className="mt-6">
            <div className="surface-panel overflow-x-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Profesionales</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Solicitudes</TableHead>
                    <TableHead className="text-right">Trabajos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liquidezPorCiudad.map((l) => (
                    <TableRow key={l.ciudadId}>
                      <TableCell className="font-medium">
                        {ciudadesState.find((c) => c.id === l.ciudadId)?.nombre ?? l.ciudadId}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.estado === "Activa" ? "default" : "secondary"}>{l.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{l.profesionales.toLocaleString("es-AR")}</TableCell>
                      <TableCell className="text-right">{l.clientes.toLocaleString("es-AR")}</TableCell>
                      <TableCell className="text-right">{l.solicitudes.toLocaleString("es-AR")}</TableCell>
                      <TableCell className="text-right">{l.trabajos.toLocaleString("es-AR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              La liquidez de una ciudad mide cuántos profesionales, clientes y trabajos circulan en el marketplace.
            </p>
          </TabsContent>

          <TabsContent value="comercial" className="mt-6">
            <div className="surface-panel max-w-2xl p-6">
              <h2 className="font-display text-lg font-semibold">Reglas comerciales globales</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="comision">Comisión de la plataforma (%)</Label>
                  <Input
                    id="comision"
                    type="number"
                    value={config.comisionPorcentaje}
                    onChange={(e) => setConfig({ ...config, comisionPorcentaje: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visita">Cargo de visita mínimo (ARS)</Label>
                  <Input
                    id="visita"
                    type="number"
                    value={config.cargoVisitaMinimo}
                    onChange={(e) => setConfig({ ...config, cargoVisitaMinimo: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radio">Radio máximo de cobertura (km)</Label>
                  <Input
                    id="radio"
                    type="number"
                    value={config.radioMaximoKm}
                    onChange={(e) => setConfig({ ...config, radioMaximoKm: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presupuestos">Presupuestos por solicitud</Label>
                  <Input
                    id="presupuestos"
                    type="number"
                    value={config.presupuestosPorSolicitud}
                    onChange={(e) => setConfig({ ...config, presupuestosPorSolicitud: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Button className="mt-6" onClick={() => toast.success("Reglas comerciales guardadas")}>
                <Sliders className="size-4" />
                Guardar cambios
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="flags" className="mt-6">
            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.key} className="surface-panel flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{f.nombre}</p>
                      <Badge variant="secondary">{f.alcance === "global" ? "Global" : "Por ciudad"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{f.descripcion}</p>
                  </div>
                  <Switch
                    aria-label={f.nombre}
                    checked={f.activo}
                    onCheckedChange={(v) => {
                      setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, activo: v } : x)));
                      toast.info(`${f.nombre}: ${v ? "activado" : "desactivado"}`);
                    }}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="auditoria" className="mt-6">
            <div className="surface-panel overflow-x-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Criticidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditoria.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.id}</TableCell>
                      <TableCell className="text-muted-foreground">{a.actor}</TableCell>
                      <TableCell>{a.accion}</TableCell>
                      <TableCell className="text-muted-foreground">{a.objetivo}</TableCell>
                      <TableCell className="text-muted-foreground">{a.fecha}</TableCell>
                      <TableCell>
                        <Badge variant={a.criticidad === "alta" ? "destructive" : "secondary"}>{a.criticidad}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="incidentes" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { k: "Críticos", v: incidentesAbiertos.filter((i) => i.severidad === "crítico").length, color: "text-red-500", bg: "bg-red-500/10" },
                { k: "Altos", v: incidentesAbiertos.filter((i) => i.severidad === "alto").length, color: "text-orange-500", bg: "bg-orange-500/10" },
                { k: "Medios", v: incidentesAbiertos.filter((i) => i.severidad === "medio").length, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                { k: "Bajos", v: incidentesAbiertos.filter((i) => i.severidad === "bajo").length, color: "text-green-500", bg: "bg-green-500/10" },
              ].map((s) => (
                <div key={s.k} className={`surface-panel p-5 ${s.bg}`}>
                  <p className="text-sm text-muted-foreground">{s.k}</p>
                  <p className={`font-display text-3xl font-semibold ${s.color}`}>{s.v}</p>
                </div>
              ))}
            </div>

            <div className="surface-panel overflow-x-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Reportado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentesAbiertos.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.id}</TableCell>
                      <TableCell>{i.tipo}</TableCell>
                      <TableCell className="text-muted-foreground">{i.descripcion}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            i.severidad === "crítico" ? "destructive" : i.severidad === "alto" ? "default" : "secondary"
                          }
                        >
                          {i.severidad}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{i.reportadoHace}</TableCell>
                    </TableRow>
                  ))}
                  {incidentesAbiertos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No hay incidentes abiertos. Tipos monitoreados: Profesional reportado, Cliente reportado, Problema de contratación, Verificación fallida, Error de pago, Problema técnico y Reclamo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="sistema" className="mt-6 grid gap-4 sm:grid-cols-2">
            {saludSistema.map((s) => (
              <div key={s.servicio} className="surface-panel p-5">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <p className="font-medium">{s.servicio}</p>
                  <span
                    className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${
                      s.estado === "ok" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {s.estado === "ok" ? "Operativo" : "Degradado"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.detalle}</p>
              </div>
            ))}
            <div className="surface-panel p-5 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <p className="font-medium">Usuarios con acceso a la plataforma</p>
                <span className="ml-auto font-display text-lg font-semibold">{equipo.length}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Datos mockeados del MVP: al conectar el backend, estos paneles leerán roles reales y registros de auditoría.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}
