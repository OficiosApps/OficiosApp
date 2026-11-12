import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  MapPin,
  Plus,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompanyCoordination } from "@/components/company-coordination";
import { DetailedQuoteForm, QuoteBreakdownView } from "@/components/detailed-quotes";
import { quoteTotal, type QuoteBreakdown } from "@/lib/service-operations";
import {
  IdentityVerification,
  LogoUpload,
  StoredImage,
  useIdentityRecords,
} from "@/components/identity-verification";
import { identityLabels } from "@/lib/identity-demo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categorias, ciudades, formatARS } from "@/lib/mock-data";
import {
  addCompanyMember,
  advanceCompanyJob,
  assignCompanyJob,
  initialCompanyDemo,
  isCompanyDemo,
  memberIsBusy,
  newCompanyDemo,
  quoteCompanyJob,
  validateCompanyProfile,
  type CompanyDemo,
  type CompanyJob,
  type CompanyJobStatus,
  type CompanyProfile,
} from "@/lib/company-demo";

export const Route = createFileRoute("/panel-empresa")({
  head: () => ({
    meta: [
      { title: "Panel de empresa — tu equipo, tus servicios | Oficios" },
      {
        name: "description",
        content:
          "Gestioná los servicios de tu empresa de oficios, coordiná a tus profesionales y organizá presupuestos y trabajos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompanyPanel,
});

const STORAGE_KEY = "oficios-empresa-demo-v1";
const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const statusLabels: Record<CompanyJobStatus, string> = {
  nueva: "Nueva solicitud",
  presupuestada: "Presupuesto preparado",
  confirmada: "Confirmada",
  "en-curso": "En curso",
  finalizada: "Finalizada",
};
const categoryName = (slug: string) =>
  categorias.find((item) => item.slug === slug)?.nombre ?? slug;
const cityName = (id: string) => ciudades.find((item) => item.id === id)?.nombre ?? id;
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

function CompanyPanel() {
  const [company, setCompany] = useState<CompanyDemo>(initialCompanyDemo);
  const [ready, setReady] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [tab, setTab] = useState("resumen");
  const [memberDialog, setMemberDialog] = useState(false);
  const [verificationMemberId, setVerificationMemberId] = useState("");
  const { records: identityRecords } = useIdentityRecords();
  const verifiedMemberIds = identityRecords
    .filter((record) => record.status === "approved")
    .map((record) => record.subjectId);
  const verificationMember = company.members.find((member) => member.id === verificationMemberId);
  const [profilePreview, setProfilePreview] = useState(false);
  const [newDialog, setNewDialog] = useState(false);
  const [filter, setFilter] = useState("todas");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: unknown = JSON.parse(saved);
        if (isCompanyDemo(data)) setCompany(data);
      }
    } catch {
      setStorageUnavailable(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(company));
    } catch {
      setStorageUnavailable(true);
    }
  }, [company, ready]);

  function update(operation: (state: CompanyDemo) => CompanyDemo, message: string): boolean {
    try {
      const next = operation(company);
      setCompany(next);
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cambio.");
      return false;
    }
  }

  function reset() {
    if (
      window.confirm(
        "¿Volver a la empresa de ejemplo? Se reemplazarán los cambios de prueba de este navegador.",
      )
    ) {
      setCompany(initialCompanyDemo());
      setTab("resumen");
      toast.success("Empresa de ejemplo restaurada");
    }
  }

  const { profile, members } = company;
  const requests = company.jobs.filter(
    (job) =>
      job.status !== "nueva" ||
      (profile.categories.includes(job.category) && job.cityId === profile.cityId),
  );
  const activeJobs = requests.filter((job) => ["confirmada", "en-curso"].includes(job.status));
  const completed = requests.filter((job) => job.status === "finalizada");
  const newRequests = requests.filter((job) => job.status === "nueva");
  const availableMembers = members.filter(
    (member) =>
      member.available &&
      verifiedMemberIds.includes(member.id) &&
      !memberIsBusy(company, member.id) &&
      profile.categories.includes(member.category),
  );
  const contractedValue = requests
    .filter((job) => ["confirmada", "en-curso", "finalizada"].includes(job.status))
    .reduce((sum, job) => sum + (job.amount ?? 0), 0);
  const filteredRequests = requests.filter(
    (job) =>
      filter === "todas" ||
      (filter === "trabajos"
        ? ["confirmada", "en-curso", "finalizada"].includes(job.status)
        : job.status === filter),
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-amber-950">
          <p>
            <strong>Empresa de demostración.</strong> Los cambios se guardan en este navegador. No
            se crean cuentas ni se envían presupuestos reales.
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={!ready}
            className="font-semibold underline underline-offset-4"
          >
            Restaurar ejemplo
          </button>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="size-4" />
            Espacio de empresas
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/panel-profesional">
                Trabajo por mi cuenta
                <ArrowRight />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewDialog(true)}
              disabled={!ready}
            >
              <Plus />
              Crear empresa de prueba
            </Button>
          </div>
        </div>
        <section className="gradient-trust relative overflow-hidden rounded-3xl p-6 text-primary-foreground sm:p-9">
          <div
            className="absolute -right-8 -top-12 size-56 rounded-full border-[32px] border-white/5"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 font-display text-3xl font-semibold">
              <StoredImage
                assetId={profile.logoAssetId}
                alt={`Logo de ${profile.name}`}
                className="size-full rounded-2xl bg-white object-contain p-1"
                fallback={<>{initials(profile.name)}</>}
              />
            </span>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/65">
                Panel de tu empresa
              </p>
              <h1 className="mt-2 break-words font-display text-3xl font-semibold sm:text-4xl">
                {profile.name}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {cityName(profile.cityId)} · {profile.radiusKm} km
                </span>
                <span>
                  {profile.categories.length}{" "}
                  {profile.categories.length === 1 ? "oficio" : "oficios"}
                </span>
                <span>
                  {members.length} {members.length === 1 ? "profesional" : "profesionales"}
                </span>
              </p>
            </div>
            <Button variant="secondary" onClick={() => setProfilePreview(true)} disabled={!ready}>
              <Eye />
              Ver perfil de empresa
            </Button>
          </div>
        </section>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" />
          Responsable de empresa: gestionás tus servicios y tus profesionales. Este perfil no otorga
          permisos de administrador de la plataforma.
        </p>
        {storageUnavailable && (
          <p role="status" className="mt-4 rounded-xl bg-secondary p-4 text-sm">
            No se pudieron guardar los datos en este navegador. La prueba sigue disponible, pero los
            cambios se perderán al recargar.
          </p>
        )}

        {!ready ? (
          <div role="status" className="surface-panel mt-8 p-12 text-center text-muted-foreground">
            Preparando tu panel de empresa…
          </div>
        ) : (
          <>
            <div className="my-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Solicitudes nuevas",
                  value: String(newRequests.length),
                  detail: "De tus oficios y ciudad",
                  icon: ClipboardList,
                },
                {
                  label: "Profesionales disponibles",
                  value: `${availableMembers.length} de ${members.length}`,
                  detail: "Listos para recibir un trabajo",
                  icon: Users,
                },
                {
                  label: "Trabajos en marcha",
                  value: String(activeJobs.length),
                  detail: `${completed.length} finalizados`,
                  icon: Wrench,
                },
                {
                  label: "Valor de trabajos contratados",
                  value: formatARS(contractedValue),
                  detail: "Datos de esta demostración",
                  icon: Wallet,
                },
              ].map((metric) => (
                <div key={metric.label} className="surface-panel p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <metric.icon className="size-4 shrink-0 text-primary" />
                  </div>
                  <p className="mt-3 font-display text-2xl font-semibold">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                </div>
              ))}
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl p-1 sm:w-auto">
                {[
                  { value: "resumen", label: "Resumen", icon: Building2 },
                  { value: "solicitudes", label: "Solicitudes y trabajos", icon: ClipboardList },
                  { value: "equipo", label: "Mis profesionales", icon: Users },
                  { value: "agenda", label: "Agenda del equipo", icon: ClipboardList },
                  { value: "servicios", label: "Servicios", icon: Wrench },
                  { value: "perfil", label: "Perfil", icon: Settings2 },
                ].map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="gap-2 py-2.5">
                    <item.icon className="size-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent
                value="resumen"
                className="mt-6 grid items-start gap-6 lg:grid-cols-[1.3fr_0.9fr]"
              >
                <section className="surface-panel p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-semibold">
                        Tu operación, en un lugar
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Coordiná el trabajo de todo tu equipo.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setTab("solicitudes")}>
                      Ver solicitudes
                      <ArrowRight />
                    </Button>
                  </div>
                  <div className="mt-6 space-y-4">
                    {activeJobs.length ? (
                      activeJobs.slice(0, 3).map((job) => (
                        <div key={job.id} className="rounded-xl border border-border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge variant="secondary">{statusLabels[job.status]}</Badge>
                            <span className="text-xs text-muted-foreground">{job.id}</span>
                          </div>
                          <h3 className="mt-3 text-sm font-semibold">{job.title}</h3>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {job.client} · {job.zone}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                            <p className="text-xs">
                              {job.memberId
                                ? members.find((member) => member.id === job.memberId)?.name
                                : "Pendiente de asignar profesional"}
                            </p>
                            <span className="text-sm font-semibold">
                              {formatARS(job.amount ?? 0)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        icon={<ClipboardList />}
                        title="Tu próximo trabajo empieza acá"
                        text="Prepará un presupuesto para una solicitud de tus oficios y probá cómo asignarlo a tu equipo."
                        action={
                          <Button onClick={() => setTab("solicitudes")}>
                            Ver solicitudes de prueba
                          </Button>
                        }
                      />
                    )}
                  </div>
                </section>
                <div className="space-y-6">
                  <section className="surface-panel p-5 sm:p-7">
                    <h2 className="font-display text-lg font-semibold">Prepará tu empresa</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Una empresa puede prestar varios oficios con su propio equipo.
                    </p>
                    <div className="mt-5 space-y-3">
                      {[
                        {
                          done: Boolean(profile.name && profile.email),
                          title: "Perfil de la empresa",
                          text: "Nombre, contacto y zona de cobertura",
                          target: "perfil",
                        },
                        {
                          done: profile.categories.length > 0,
                          title: "Oficios y servicios",
                          text: `${profile.categories.length} rubros seleccionados`,
                          target: "servicios",
                        },
                        {
                          done: members.length > 0,
                          title: "Equipo de profesionales",
                          text: `${members.length} integrantes cargados`,
                          target: "equipo",
                        },
                      ].map((step) => (
                        <button
                          key={step.title}
                          type="button"
                          onClick={() => setTab(step.target)}
                          className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-secondary"
                        >
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}
                          >
                            {step.done ? <Check className="size-4" /> : <Plus className="size-4" />}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold">{step.title}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {step.text}
                            </span>
                          </span>
                          <ArrowRight className="size-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-2xl border border-border bg-secondary/60 p-5">
                    <h2 className="font-semibold">Cada profesional, con su oficio</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      La empresa prepara el presupuesto y coordina el trabajo. Después de la
                      aceptación del cliente, asigna a un profesional disponible del oficio
                      correspondiente.
                    </p>
                    <Button className="mt-4" size="sm" onClick={() => setMemberDialog(true)}>
                      <Plus />
                      Sumar profesional
                    </Button>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="solicitudes" className="mt-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold">Solicitudes y trabajos</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Presupuestá como empresa y coordiná quién realiza el servicio.
                    </p>
                  </div>
                  <div className="w-full sm:w-56">
                    <Label htmlFor="job-filter" className="sr-only">
                      Filtrar solicitudes
                    </Label>
                    <select
                      id="job-filter"
                      className={selectClass}
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      <option value="todas">Todos los estados</option>
                      <option value="nueva">Nuevas solicitudes</option>
                      <option value="presupuestada">Presupuestos preparados</option>
                      <option value="trabajos">Trabajos contratados</option>
                    </select>
                  </div>
                </div>
                <div className="grid items-start gap-5 lg:grid-cols-2">
                  {filteredRequests.length ? (
                    filteredRequests.map((job) => (
                      <CompanyJobCard
                        key={job.id}
                        job={job}
                        company={company}
                        verifiedMemberIds={verifiedMemberIds}
                        onQuote={(amount) =>
                          update(
                            (state) => { const next = quoteCompanyJob(state, job.id, quoteTotal(amount)); return { ...next, jobs: next.jobs.map((item) => item.id === job.id ? { ...item, breakdown: amount } : item) }; },
                            "Presupuesto de prueba preparado",
                          )
                        }
                        onAdvance={() =>
                          update(
                            (state) => advanceCompanyJob(state, job.id, verifiedMemberIds),
                            job.status === "presupuestada"
                              ? "Aceptación del cliente simulada"
                              : job.status === "confirmada"
                                ? "Trabajo iniciado en la demo"
                                : "Trabajo finalizado en la demo",
                          )
                        }
                        onAssign={(id) =>
                          update(
                            (state) => assignCompanyJob(state, job.id, id, verifiedMemberIds),
                            "Profesional asignado al trabajo de prueba",
                          )
                        }
                      />
                    ))
                  ) : (
                    <div className="lg:col-span-2">
                      <EmptyState
                        icon={<ClipboardList />}
                        title="No hay solicitudes con este filtro"
                        text="Revisá otro estado o sumá más oficios a los servicios de tu empresa."
                        action={
                          <Button
                            variant="outline"
                            onClick={() => {
                              setFilter("todas");
                              setTab("servicios");
                            }}
                          >
                            Revisar servicios
                          </Button>
                        }
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="agenda" className="mt-6"><CompanyCoordination company={company} onUpdate={update} /></TabsContent>
              <TabsContent value="equipo" className="mt-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold">Mis profesionales</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      El equipo que presta servicios en nombre de tu empresa.
                    </p>
                  </div>
                  <Button onClick={() => setMemberDialog(true)}>
                    <Plus />
                    Sumar profesional
                  </Button>
                </div>
                {members.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((member) => {
                      const busy = memberIsBusy(company, member.id);
                      const serviceActive = profile.categories.includes(member.category);
                      return (
                        <article key={member.id} className="surface-panel p-5">
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex size-12 items-center justify-center rounded-xl bg-secondary font-display font-semibold text-primary">
                              {initials(member.name)}
                            </span>
                            <Badge variant="secondary">
                              {!verifiedMemberIds.includes(member.id)
                                ? "Identidad requerida"
                                : busy
                                  ? "Con trabajo asignado"
                                  : !serviceActive
                                    ? "Servicio pausado"
                                    : member.available
                                      ? "Disponible"
                                      : "No disponible"}
                            </Badge>
                          </div>
                          <h3 className="mt-4 font-semibold">{member.name}</h3>
                          <p className="mt-1 text-sm text-primary">
                            {categoryName(member.category)}
                          </p>
                          <p className="mt-2 break-all text-xs text-muted-foreground">
                            {member.email}
                          </p>
                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                            <Label htmlFor={`available-${member.id}`} className="text-xs">
                              Recibir nuevas asignaciones
                            </Label>
                            <Switch
                              id={`available-${member.id}`}
                              checked={member.available && verifiedMemberIds.includes(member.id)}
                              disabled={!verifiedMemberIds.includes(member.id)}
                              onCheckedChange={(available) =>
                                setCompany((state) => ({
                                  ...state,
                                  members: state.members.map((item) =>
                                    item.id === member.id ? { ...item, available } : item,
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="mt-4 rounded-xl border border-border p-3">
                            <p className="mb-2 text-xs font-medium">
                              {
                                identityLabels[
                                  identityRecords.find((record) => record.subjectId === member.id)
                                    ?.status ?? "missing"
                                ]
                              }
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setVerificationMemberId(member.id)}
                            >
                              DNI y selfie obligatorios
                            </Button>
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {busy
                              ? "El trabajo actual mantiene su asignación hasta que finalice."
                              : "Sólo recibe trabajos de su oficio y cuando está disponible."}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Users />}
                    title="Armá tu equipo de profesionales"
                    text="Sumá a quienes prestan servicios para tu empresa y elegí su oficio."
                    action={
                      <Button onClick={() => setMemberDialog(true)}>
                        <Plus />
                        Sumar mi primer profesional
                      </Button>
                    }
                  />
                )}
                <p className="mt-5 text-xs text-muted-foreground">
                  Los integrantes son prestadores de tu empresa, no administradores de Oficios. En
                  esta demo, cargarlos no crea usuarios ni envía invitaciones.
                </p>
              </TabsContent>

              <TabsContent value="servicios" className="mt-6">
                <ServicesForm
                  key={profile.categories.join(",")}
                  profile={profile}
                  onSave={(categories, urgent) =>
                    update(
                      (state) => ({
                        ...state,
                        profile: validateCompanyProfile({ ...state.profile, categories, urgent }),
                      }),
                      "Servicios de la empresa guardados en este navegador",
                    )
                  }
                />
              </TabsContent>
              <TabsContent value="perfil" className="mt-6">
                <section className="surface-panel max-w-3xl p-5 sm:p-7">
                  <h2 className="font-display text-xl font-semibold">Perfil de la empresa</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tu presentación y la zona donde trabaja tu equipo.
                  </p>
                  <CompanyProfileForm
                    key={`${profile.name}-${profile.cityId}`}
                    profile={profile}
                    newCompany={false}
                    onSave={(next) =>
                      update(
                        (state) => ({ ...state, profile: validateCompanyProfile(next) }),
                        "Perfil de prueba guardado",
                      )
                    }
                  />
                </section>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <SiteFooter />

      <Dialog
        open={Boolean(verificationMember)}
        onOpenChange={(open) => {
          if (!open) setVerificationMemberId("");
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Verificación del profesional</DialogTitle>
            <DialogDescription>
              Obligatoria para recibir nuevas asignaciones de la empresa. Carga de prueba en este
              navegador.
            </DialogDescription>
          </DialogHeader>
          {verificationMember && (
            <IdentityVerification
              key={verificationMember.id}
              subjectId={verificationMember.id}
              name={verificationMember.name}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sumar profesional a mi empresa</DialogTitle>
            <DialogDescription>
              Elegí un oficio activo de tu empresa. Esta acción sólo agrega un integrante a la
              demostración.
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            categories={profile.categories}
            onSave={(input) => {
              const saved = update(
                (state) => addCompanyMember(state, input, crypto.randomUUID()),
                "Profesional agregado a tu empresa de prueba",
              );
              if (saved) {
                setMemberDialog(false);
                setTab("equipo");
              }
              return saved;
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Creá tu empresa de prueba</DialogTitle>
            <DialogDescription>
              Para empresas de cualquier oficio, con uno o varios profesionales. Reemplaza la
              empresa de prueba de este navegador.
            </DialogDescription>
          </DialogHeader>
          <CompanyProfileForm
            profile={{
              name: "",
              email: "",
              phone: "",
              cityId: ciudades[0]!.id,
              categories: [],
              description: "",
              radiusKm: 15,
              urgent: false,
            }}
            newCompany
            onSave={(profile) => {
              const saved = update(
                () => newCompanyDemo(profile),
                "Tu empresa de prueba está lista",
              );
              if (saved) {
                setNewDialog(false);
                setTab("equipo");
              }
              return saved;
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={profilePreview} onOpenChange={setProfilePreview}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl p-0">
          <DialogHeader className="gradient-trust p-7 text-primary-foreground">
            <p className="mb-4 text-xs uppercase tracking-wider text-white/70">
              Vista previa · perfil de empresa
            </p>
            <div className="mb-4 flex size-20 items-center justify-center overflow-hidden rounded-xl bg-white/10">
              <StoredImage
                assetId={profile.logoAssetId}
                alt={`Logo de ${profile.name}`}
                className="size-full bg-white object-contain p-1"
                fallback={<Building2 className="size-8" />}
              />
            </div>
            <DialogTitle className="pr-7 font-display text-2xl">{profile.name}</DialogTitle>
            <DialogDescription className="pt-2 text-white/80">
              {cityName(profile.cityId)} · Radio de {profile.radiusKm} km
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 px-7 pb-7">
            <div className="flex flex-wrap gap-2">
              {profile.categories.map((slug) => (
                <Badge key={slug} variant="secondary">
                  {categoryName(slug)}
                </Badge>
              ))}
              {profile.urgent && <Badge variant="outline">Recibe urgencias</Badge>}
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {profile.description || "La empresa todavía no completó su presentación."}
            </p>
            <div>
              <h3 className="font-semibold">Profesionales de la empresa</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {members.length} {members.length === 1 ? "integrante" : "integrantes"} ·
                {members.filter((member) => verifiedMemberIds.includes(member.id)).length} identidades aprobadas en esta demo.
              </p>
              <ul className="mt-4 space-y-3">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {initials(member.name)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{member.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {categoryName(member.category)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="rounded-xl bg-secondary p-4 text-xs leading-relaxed text-muted-foreground">
              Así se presenta la empresa en esta demostración. El perfil todavía no está conectado a
              las búsquedas públicas ni permite contrataciones reales.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyJobCard({
  job,
  company,
  verifiedMemberIds,
  onQuote,
  onAssign,
  onAdvance,
}: {
  job: CompanyJob;
  company: CompanyDemo;
  verifiedMemberIds: string[];
  onQuote: (amount: QuoteBreakdown) => boolean;
  onAssign: (id: string) => boolean;
  onAdvance: () => boolean;
}) {
  const [amount, setAmount] = useState("");
  const [memberId, setMemberId] = useState(job.memberId ?? "");
  const eligible = company.members.filter(
    (member) =>
      member.category === job.category &&
      verifiedMemberIds.includes(member.id) &&
      member.available &&
      !memberIsBusy(company, member.id, job.id),
  );
  const assigned = company.members.find((member) => member.id === job.memberId);
  return (
    <article className="surface-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge
          variant={
            job.status === "en-curso" || job.status === "finalizada" ? "default" : "secondary"
          }
        >
          {statusLabels[job.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">{job.id}</span>
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{job.title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">
        {job.client} · {job.zone}, {cityName(job.cityId)}
      </p>
      <p className="mt-2 text-xs font-medium text-primary">{categoryName(job.category)}</p>
      {job.amount !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/60 p-3">
          <span className="text-xs text-muted-foreground">Presupuesto de tu empresa</span>
          <span className="font-semibold">{formatARS(job.amount)}</span>
        </div>
      )}
      {job.breakdown && <div className="mt-4"><QuoteBreakdownView value={job.breakdown} /></div>}
      {job.status === "nueva" && <div className="mt-5 border-t border-border pt-4"><DetailedQuoteForm id={job.id} onSubmit={onQuote} label="Preparar presupuesto de empresa" /></div>}
      {job.status === "presupuestada" && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            En el flujo real, el cliente recibe el presupuesto y decide si lo acepta. Podés simular
            esa aceptación para seguir probando.
          </p>
          <Button variant="outline" size="sm" onClick={onAdvance}>
            Simular aceptación del cliente
            <ArrowRight />
          </Button>
        </div>
      )}
      {job.status === "confirmada" && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold">
            {assigned
              ? `Profesional asignado: ${assigned.name}`
              : "Asigná un profesional de tu equipo"}
          </p>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onAssign(memberId);
            }}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor={`assign-${job.id}`} className="sr-only">
                Profesional para {job.title}
              </Label>
              <select
                id={`assign-${job.id}`}
                className={selectClass}
                required
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
              >
                <option value="">Elegí un profesional</option>
                {eligible.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
                {assigned && !eligible.some((member) => member.id === assigned.id) && (
                  <option value={assigned.id} disabled>
                    {assigned.name} (asignado)
                  </option>
                )}
              </select>
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-10"
              disabled={!eligible.length}
            >
              Asignar
            </Button>
          </form>
          {!eligible.length && (
            <p className="text-xs text-muted-foreground">
              No hay profesionales habilitados de este oficio. Revisá DNI, selfie, aprobación y disponibilidad
              en Mis profesionales.
            </p>
          )}
          <Button
            size="sm"
            onClick={onAdvance}
            disabled={!job.memberId || !verifiedMemberIds.includes(job.memberId)}
          >
            Iniciar trabajo
            <ArrowRight />
          </Button>
          {job.memberId && !verifiedMemberIds.includes(job.memberId) && <p className="text-xs text-muted-foreground">El profesional asignado necesita la aprobación de su DNI y selfie antes de iniciar.</p>}
        </div>
      )}
      {(job.status === "en-curso" || job.status === "finalizada") && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="flex items-center gap-2 text-xs">
            <Users className="size-4 text-primary" />
            {assigned?.name ?? "Profesional de la empresa"}
          </p>
          {job.status === "en-curso" ? (
            <Button size="sm" onClick={onAdvance}>
              <CheckCircle2 />
              Marcar como finalizado
            </Button>
          ) : (
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="size-4" />
              Trabajo finalizado en la demo
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function MemberForm({
  categories,
  onSave,
}: {
  categories: string[];
  onSave: (member: { name: string; email: string; category: string }) => boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ name, email, category });
      }}
    >
      <Field label="Nombre y apellido" id="member-name">
        <Input
          id="member-name"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={100}
          placeholder="Ej.: Lucía Fernández"
        />
      </Field>
      <Field label="Correo electrónico" id="member-email">
        <Input
          id="member-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={200}
          placeholder="nombre@ejemplo.com"
        />
      </Field>
      <Field label="Oficio dentro de la empresa" id="member-trade">
        <select
          id="member-trade"
          className={selectClass}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          {categories.map((slug) => (
            <option key={slug} value={slug}>
              {categoryName(slug)}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Después de agregarlo, debe completar DNI y selfie y obtener aprobación para recibir
        asignaciones. El profesional sólo podrá recibir asignaciones del oficio que elijas. No
        obtiene permisos de administrador ni superadministrador.
      </p>
      <Button type="submit" className="w-full">
        <Plus />
        Agregar profesional de prueba
      </Button>
    </form>
  );
}

function CompanyProfileForm({
  profile,
  newCompany,
  onSave,
}: {
  profile: CompanyProfile;
  newCompany: boolean;
  onSave: (profile: CompanyProfile) => boolean;
}) {
  const [draft, setDraft] = useState(profile);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
  }
  return (
    <form className="mt-5 space-y-5" onSubmit={submit}>
      <LogoUpload
        assetId={draft.logoAssetId}
        onChange={(logoAssetId) => setDraft({ ...draft, logoAssetId })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la empresa" id="company-name">
          <Input
            id="company-name"
            required
            minLength={2}
            maxLength={100}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Ej.: Pinturas del Oeste"
          />
        </Field>
        <Field label="Correo de la empresa" id="company-email">
          <Input
            id="company-email"
            type="email"
            required
            maxLength={200}
            value={draft.email}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            placeholder="contacto@ejemplo.com"
          />
        </Field>
        <Field label="Teléfono de contacto (opcional)" id="company-phone">
          <Input
            id="company-phone"
            type="tel"
            maxLength={40}
            value={draft.phone}
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
          />
        </Field>
        <Field label="Ciudad base" id="company-city">
          <select
            id="company-city"
            className={selectClass}
            value={draft.cityId}
            onChange={(event) => setDraft({ ...draft, cityId: event.target.value })}
          >
            {ciudades.map((city) => (
              <option key={city.id} value={city.id}>
                {city.nombre}, {city.provincia}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={`Radio de cobertura: ${draft.radiusKm} km`} id="company-radius">
        <Input
          id="company-radius"
          type="range"
          className="h-7 border-0 px-0 shadow-none accent-primary"
          min={2}
          max={50}
          step={1}
          value={draft.radiusKm}
          onChange={(event) => setDraft({ ...draft, radiusKm: Number(event.target.value) })}
        />
      </Field>
      <Field label="Presentación de la empresa" id="company-description">
        <Textarea
          id="company-description"
          rows={3}
          maxLength={1200}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          placeholder="Contá qué servicios prestan y cómo trabaja tu equipo."
        />
      </Field>
      {newCompany && (
        <fieldset>
          <legend className="mb-3 text-sm font-medium">¿Qué oficios presta tu empresa?</legend>
          <TradeCheckboxes
            selected={draft.categories}
            onChange={(categories) => setDraft({ ...draft, categories })}
          />
        </fieldset>
      )}
      <Button type="submit">
        {newCompany ? "Crear mi empresa de prueba" : "Guardar perfil de empresa"}
        <ArrowRight />
      </Button>
      {!newCompany && (
        <p className="text-xs text-muted-foreground">
          Los oficios se administran desde la pestaña Servicios. Los cambios se guardan sólo en este
          navegador.
        </p>
      )}
    </form>
  );
}

function ServicesForm({
  profile,
  onSave,
}: {
  profile: CompanyProfile;
  onSave: (categories: string[], urgent: boolean) => boolean;
}) {
  const [selected, setSelected] = useState(profile.categories);
  const [urgent, setUrgent] = useState(profile.urgent);
  return (
    <section className="surface-panel p-5 sm:p-7">
      <h2 className="font-display text-xl font-semibold">Los oficios de tu empresa</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Elegí uno o varios rubros. Las solicitudes nuevas se muestran según estos servicios y la
        ciudad de tu empresa. Los trabajos ya contratados se conservan si pausás un oficio.
      </p>
      <form
        className="mt-6 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(selected, urgent);
        }}
      >
        <fieldset>
          <legend className="sr-only">Oficios ofrecidos</legend>
          <TradeCheckboxes selected={selected} onChange={setSelected} detailed />
        </fieldset>
        <div className="flex max-w-xl items-center justify-between gap-4 rounded-xl bg-secondary/60 p-4">
          <div>
            <Label htmlFor="company-urgent">Recibimos urgencias</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Mostrá esta disponibilidad en el perfil de empresa de prueba.
            </p>
          </div>
          <Switch id="company-urgent" checked={urgent} onCheckedChange={setUrgent} />
        </div>
        <Button type="submit">Guardar servicios</Button>
      </form>
    </section>
  );
}

function TradeCheckboxes({
  selected,
  onChange,
  detailed = false,
}: {
  selected: string[];
  onChange: (categories: string[]) => void;
  detailed?: boolean;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${detailed ? "lg:grid-cols-4" : ""}`}>
      {categorias.map((category) => (
        <label
          key={category.slug}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${selected.includes(category.slug) ? "border-primary bg-secondary/60" : "border-border hover:bg-secondary/30"}`}
        >
          <input
            type="checkbox"
            checked={selected.includes(category.slug)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, category.slug]
                  : selected.filter((slug) => slug !== category.slug),
              )
            }
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>
            <span className="block text-sm font-semibold">{category.nombre}</span>
            {detailed && (
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                {category.descripcion}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
      <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </span>
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mb-5 mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {text}
      </p>
      {action}
    </div>
  );
}
