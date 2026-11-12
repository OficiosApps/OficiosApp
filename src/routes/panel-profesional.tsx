import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Bell, Clock, MapPin, Star, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProfessionalWorkGallery } from "@/components/professional-work-portfolio";
import { ProfessionalQuoteBoard } from "@/components/detailed-quotes";
import { ProfessionalActivitySummary } from "@/components/activity-metrics";
import { ProfessionalClientInbox } from "@/components/contact-conversation";
import { useProfessionalAccount } from "@/hooks/use-professional-account";
import { monthKey, planFor, recordProfessionalQuote } from "@/lib/professional-account";
import { IdentityVerification, useIdentityRecords } from "@/components/identity-verification";
import {
  etiquetaVerificacion,
  formatARS,
  getProfesional,
  solicitudesEntrantes,
  trabajosPro,
} from "@/lib/mock-data";

export const Route = createFileRoute("/panel-profesional")({
  head: () => ({
    meta: [
      { title: "Panel del profesional — recibí trabajos de tu zona | Oficios" },
      {
        name: "description",
        content:
          "Gestioná tu perfil, servicios, radio de trabajo, horarios y presupuestos. Recibí solicitudes reales de clientes de tu zona.",
      },
      { property: "og:title", content: "Panel del profesional | Oficios" },
      {
        property: "og:description",
        content: "Solicitudes entrantes, presupuestos rápidos y tu reputación en un solo lugar.",
      },
    ],
  }),
  component: PanelProfesional,
});

const estadoTrabajo: Record<string, string> = {
  agendado: "bg-secondary text-secondary-foreground",
  "en-curso": "bg-accent/15 text-accent-foreground",
  finalizado: "bg-success/15 text-success",
  "a-cobrar": "bg-warning/20 text-warning-foreground",
};

function PanelProfesional() {
  const pro = getProfesional("pro-1")!;
  const { account, ready: accountReady, error: accountError, update: updateAccount } = useProfessionalAccount();
  const currentPlan = planFor(account.planId);
  const monthlyQuotes = account.quotes[monthKey()] ?? [];
  const { records } = useIdentityRecords();
  const identity = records.find((record) => record.subjectId === "individual-pro-1");
  const verified = identity?.status === "approved";
  const [tab, setTab] = useState("presupuestos-detallados");
  const [disponible, setDisponible] = useState(true);
  const [urgencias, setUrgencias] = useState(pro.urgencias);
  const [radio, setRadio] = useState<number[]>([10]);
  useEffect(() => { if (accountReady) setRadio((current) => [Math.min(current[0] ?? pro.radioKm, currentPlan.radius)]); }, [currentPlan.radius, accountReady, pro.radioKm]);
  const [monto, setMonto] = useState("");
  const [respondida, setRespondida] = useState<string[]>([]);
  const [descartadas, setDescartadas] = useState<string[]>([]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="gradient-trust flex size-14 items-center justify-center rounded-2xl font-display font-semibold text-primary-foreground">
              {pro.iniciales}
            </span>
            <div>
              <h1 className="flex items-center gap-2 font-display text-2xl font-semibold sm:text-3xl">
                {pro.nombre} {verified && <BadgeCheck className="size-5 text-primary" />}
              </h1>
              <p className="text-muted-foreground">{pro.oficio}</p>
            </div>
          </div>
          <div className="surface-panel flex items-center gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{!verified ? "Verificación requerida" : disponible ? "Disponible ahora" : "No disponible"}</p>
              <p className="text-xs text-muted-foreground">Los clientes ven este estado</p>
            </div>
            <Switch checked={verified && disponible} disabled={!verified} onCheckedChange={setDisponible} aria-label="Disponibilidad" />
          </div>
        </div>

        <section className="surface-panel mt-6 flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-semibold">Mi plan {currentPlan.name} · USD {currentPlan.usd}/mes</p><p className="mt-1 text-xs text-muted-foreground">{monthlyQuotes.length} de {currentPlan.quotes ?? "ilimitados"} presupuestos de prueba este mes · Cobertura hasta {currentPlan.radius} km · {currentPlan.methods} métodos de cobro</p></div><div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link to="/planes-profesionales">Ver planes</Link></Button><Button asChild size="sm" variant="outline"><Link to="/metodos-de-pago">Mis métodos de cobro</Link></Button></div>{accountError && <p role="alert" className="w-full text-xs text-destructive">{accountError}</p>}</section>
        {!verified && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-secondary p-5"><div><h2 className="font-semibold">Antes de prestar servicios, verificá tu identidad</h2><p className="mt-1 text-sm text-muted-foreground">Necesitás DNI, fotos de ambos lados y una selfie, con aprobación posterior.</p></div><Button onClick={() => setTab("identidad")}>Completar verificación</Button></div>}
        <ProfessionalActivitySummary professionalId={pro.id} />
        <Tabs value={tab} onValueChange={setTab} className="mt-10">
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            <TabsTrigger value="solicitudes">Solicitudes de ejemplo</TabsTrigger>
            <TabsTrigger value="presupuestos-detallados">Presupuestos detallados</TabsTrigger>
            <TabsTrigger value="portafolio">Mi portafolio</TabsTrigger>
            <TabsTrigger value="trabajos">Trabajos</TabsTrigger>
            <TabsTrigger value="mensajes-clientes">Mensajes de clientes</TabsTrigger>
            <TabsTrigger value="perfil">Mi perfil</TabsTrigger>
            <TabsTrigger value="identidad">DNI y selfie *</TabsTrigger>
          </TabsList>

          <TabsContent value="portafolio" className="mt-6"><ProfessionalWorkGallery professionalId={pro.id} manage /></TabsContent>
          <TabsContent value="presupuestos-detallados" className="mt-6"><ProfessionalQuoteBoard /></TabsContent>
          <TabsContent value="mensajes-clientes" className="mt-6"><ProfessionalClientInbox professionalId={pro.id} /></TabsContent>
          <TabsContent value="identidad" className="mt-6"><IdentityVerification subjectId="individual-pro-1" name={pro.nombre} /></TabsContent>
          <TabsContent value="solicitudes" className="mt-6 space-y-4">
            {solicitudesEntrantes.map((s) => {
              const hecho = respondida.includes(s.id) || monthlyQuotes.includes(s.id);
              return (
                <article key={s.id} className="surface-panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-display font-semibold">
                        {s.servicio}
                        {s.tipo === "urgente" && (
                          <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-foreground">
                            <Zap className="size-3" /> Urgente
                          </span>
                        )}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" /> {s.zona} · {s.distanciaKm} km
                        </span>
                        <span>{s.hace}</span>
                        <span>{s.presupuestosEnviados} presupuestos enviados</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.id}</span>
                  </div>

                  {hecho || descartadas.includes(s.id) ? (
                    <p className="mt-4 text-sm font-medium text-success">{descartadas.includes(s.id) ? "Solicitud descartada" : "Presupuesto registrado en la demo"}</p>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                      <div className="w-40 space-y-1.5">
                        <Label htmlFor={`m-${s.id}`} className="text-xs">
                          Monto estimado
                        </Label>
                        <Input
                          id={`m-${s.id}`}
                          inputMode="numeric"
                          placeholder="45000"
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!verified || !accountReady || Boolean(accountError) || (currentPlan.quotes !== null && monthlyQuotes.length >= currentPlan.quotes)}
                        onClick={() => {
                          if (!verified) return;
                          if (!Number.isFinite(Number(monto)) || Number(monto) <= 0) { toast.error("Ingresá un monto válido mayor a cero."); return; }
                          try { updateAccount((account) => recordProfessionalQuote(account, s.id)); }
                          catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo registrar el presupuesto de prueba."); return; }
                          setRespondida((prev) => [...prev, s.id]);
                          toast.success("Presupuesto registrado en la demo", { description: "Se contó dentro de los presupuestos de tu plan. No se envió a un cliente real." });
                        }}
                      >
                        Enviar presupuesto
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDescartadas((prev) => [...prev, s.id])}>
                        No me interesa
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </TabsContent>

          <TabsContent value="trabajos" className="mt-6">
            <div className="surface-panel overflow-x-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trabajosPro.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.id}</TableCell>
                      <TableCell>{t.cliente}</TableCell>
                      <TableCell>{t.servicio}</TableCell>
                      <TableCell>{t.fecha}</TableCell>
                      <TableCell className="text-right">{formatARS(t.monto)}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estadoTrabajo[t.estado]}`}>
                          {t.estado.replace("-", " ")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="perfil" className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="surface-panel space-y-5 p-6">
              <h2 className="font-display text-lg font-semibold">Zona y disponibilidad</h2>
              <div className="space-y-3">
                <Label>Radio de trabajo: {radio[0]} km</Label>
                <Slider value={radio} onValueChange={setRadio} min={2} max={currentPlan.radius} step={1} disabled={!accountReady} />
                <p className="text-xs text-primary">Plan {currentPlan.name}: cobertura de hasta {currentPlan.radius} km.</p>
                <p className="text-xs text-muted-foreground">
                  Sólo recibís solicitudes dentro de este radio desde {pro.barrio}.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="urg-pro">Atiendo urgencias</Label>
                <Switch id="urg-pro" checked={urgencias} onCheckedChange={setUrgencias} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hor">Horarios</Label>
                <Input id="hor" defaultValue={pro.horarios} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Descripción</Label>
                <Textarea id="bio" rows={4} defaultValue={pro.descripcion} />
              </div>
              <Button onClick={() => toast.success("Perfil actualizado")}>Guardar cambios</Button>
            </div>

            <div className="space-y-6">
              <div className="surface-panel p-6">
                <h2 className="font-display text-lg font-semibold">Precios de referencia</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ph">Precio por hora</Label>
                    <Input id="ph" defaultValue={pro.precioHora} inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pv">Costo de visita</Label>
                    <Input id="pv" defaultValue={pro.precioVisita} inputMode="numeric" />
                  </div>
                </div>
              </div>

              <div className="surface-panel p-6">
                <h2 className="font-display text-lg font-semibold">Verificaciones</h2>
                <ul className="mt-4 space-y-2 text-sm">
                  {pro.verificaciones.filter((v) => v !== "identidad" || verified).map((v) => (
                    <li key={v} className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-success" /> {etiquetaVerificacion[v]}
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-2 pt-2 text-muted-foreground">
                    Certificado de antecedentes
                    <Button size="sm" variant="outline" onClick={() => toast.info("Subida de documentos en el MVP")}>
                      Subir
                    </Button>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}
