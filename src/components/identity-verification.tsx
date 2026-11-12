import { useEffect, useState, type FormEvent } from "react";
import { Camera, CheckCircle2, FileCheck2, ImagePlus, LockKeyhole, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  deleteIdentity,
  listIdentities,
  readAsset,
  saveLogo,
  setIdentityReview,
  submitIdentity,
  subscribeIdentities,
  validateImage,
} from "@/lib/demo-media";
import { identityLabels, type IdentityRecord } from "@/lib/identity-demo";

export function useIdentityRecords() {
  const [records, setRecords] = useState<IdentityRecord[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try {
        const data = await listIdentities();
        if (mounted) {
          setRecords(data);
          setError("");
        }
      } catch (error) {
        if (mounted)
          setError(error instanceof Error ? error.message : "No se pudo cargar la identidad.");
      } finally {
        if (mounted) setReady(true);
      }
    }
    void refresh();
    const unsubscribe = subscribeIdentities(() => {
      void refresh();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  return { records, error, ready };
}

export function StoredImage({
  assetId,
  alt,
  className = "",
  fallback,
}: {
  assetId: string | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let mounted = true;
    let objectUrl = "";
    setUrl("");
    if (assetId)
      void readAsset(assetId)
        .then((blob) => {
          if (blob && mounted) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch(() => {});
    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);
  return url ? (
    <img src={url} alt={alt} className={className} />
  ) : (
    <>{fallback ?? <span className="text-xs text-muted-foreground">Imagen no disponible</span>}</>
  );
}

export function LogoUpload({
  assetId,
  onChange,
}: {
  assetId: string | undefined;
  onChange: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="rounded-xl border border-border p-4">
      <Label htmlFor="company-logo">Logo de la empresa (opcional)</Label>
      <div className="mt-3 flex items-center gap-4">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
          <StoredImage
            assetId={assetId}
            alt="Logo de la empresa"
            className="size-full object-contain"
            fallback={<ImagePlus className="size-7 text-primary" />}
          />
        </span>
        <div className="min-w-0 space-y-2">
          <Input
            id="company-logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                const id = await saveLogo(file);
                onChange(id);
              } catch (error) {
                setError(error instanceof Error ? error.message : "No se pudo guardar el logo.");
              } finally {
                setBusy(false);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WEBP · hasta 2 MB · mínimo 100 × 100 px. Guardá el perfil para aplicar el
            logo.
          </p>
          {assetId && (
            <button
              type="button"
              className="text-xs font-semibold text-primary underline"
              onClick={() => onChange("")}
            >
              Quitar logo del perfil
            </button>
          )}
        </div>
      </div>
      {busy && (
        <p role="status" className="mt-2 text-xs">
          Guardando logo…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function PhotoField({
  id,
  title,
  hint,
  selfie,
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  selfie?: boolean;
  onChange: (file: File | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold text-sm">
        {selfie ? (
          <Camera className="size-4 text-primary" />
        ) : (
          <FileCheck2 className="size-4 text-primary" />
        )}
        <Label htmlFor={id}>{title} *</Label>
        {file && <CheckCircle2 className="ml-auto size-4 text-primary" />}
      </div>
      {url && (
        <img
          src={url}
          alt={`Vista previa: ${title}`}
          className={`mb-3 h-40 w-full rounded-xl bg-muted object-contain ${selfie ? "rounded-full" : ""}`}
        />
      )}
      <Input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={selfie ? "user" : "environment"}
        disabled={busy}
        aria-required="true"
        onChange={async (event) => {
          const next = event.target.files?.[0];
          if (!next) return;
          setBusy(true);
          setError("");
          setFile(null);
          onChange(null);
          try {
            await validateImage(next);
            setFile(next);
            onChange(next);
          } catch (error) {
            event.target.value = "";
            setError(error instanceof Error ? error.message : "No se pudo leer la foto.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      {busy && (
        <p role="status" className="mt-2 text-xs">
          Revisando archivo…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function IdentityVerification({ subjectId, name }: { subjectId: string; name: string }) {
  const { records, error: loadError, ready } = useIdentityRecords();
  const record = records.find((item) => item.subjectId === subjectId);
  const [dni, setDni] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await submitIdentity({ subjectId, name, dni, front, back, selfie, consent });
      setFront(null);
      setBack(null);
      setSelfie(null);
      setDni("");
      toast.success("Carga de prueba pendiente de revisión");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar la documentación.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !window.confirm(
        "¿Eliminar esta carga de prueba de tu navegador? El profesional volverá a quedar sin verificar.",
      )
    )
      return;
    try {
      await deleteIdentity(subjectId);
      setFront(null);
      setBack(null);
      setSelfie(null);
      setConsent(false);
      toast.success("Documentación de prueba eliminada");
    } catch {
      setError("No se pudo eliminar la carga.");
    }
  }
  return (
    <section className="surface-panel p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Verificación obligatoria
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold">Tu identidad, paso a paso</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {name} · DNI y foto de tu cara para revisar tu identidad.
          </p>
        </div>
        <Badge variant={record?.status === "approved" ? "default" : "secondary"}>
          {identityLabels[record?.status ?? "missing"]}
        </Badge>
      </div>
      <p className="my-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
        <strong>Prueba con imágenes ficticias.</strong> Las fotos y el DNI quedan sólo en este
        navegador, fuera del perfil público. Esta demo no valida documentos, coincidencia facial ni
        prueba de vida.
      </p>
      {loadError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {loadError}
        </p>
      )}
      {!ready ? (
        <p role="status">Cargando verificación…</p>
      ) : record && record.status !== "rejected" ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">
            {record.status === "approved"
              ? "Identidad aprobada manualmente en esta demo. Ya podés habilitar la disponibilidad y recibir asignaciones de prueba."
              : "Documentación cargada. Todavía no podés recibir nuevas asignaciones ni ofrecer servicios hasta que se apruebe la identidad."}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">Ir a la revisión de prueba</Link>
          </Button>
          <button
            type="button"
            onClick={() => {
              void remove();
            }}
            className="ml-3 text-xs text-muted-foreground underline"
          >
            Eliminar carga de prueba
          </button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          {record?.reason && (
            <p role="alert" className="rounded-xl bg-secondary p-4 text-sm">
              Revisión: {record.reason}. Volvé a cargar las tres fotos.
            </p>
          )}
          <fieldset disabled={busy} className="space-y-5">
            <legend className="sr-only">Documentación obligatoria</legend>
            <div className="max-w-xs space-y-2">
              <Label htmlFor={`${subjectId}-dni`}>1. Número de DNI *</Label>
              <Input
                id={`${subjectId}-dni`}
                inputMode="numeric"
                autoComplete="off"
                pattern="[0-9]{7,8}"
                minLength={7}
                maxLength={8}
                required
                value={dni}
                onChange={(event) => setDni(event.target.value.replace(/\D/g, ""))}
                placeholder="Sin puntos ni espacios"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <PhotoField
                id={`${subjectId}-front`}
                title="2. Frente del DNI"
                hint="Documento completo, sin reflejos y con los datos legibles."
                onChange={setFront}
              />
              <PhotoField
                id={`${subjectId}-back`}
                title="3. Dorso del DNI"
                hint="Incluí las cuatro esquinas. No recortes la foto."
                onChange={setBack}
              />
              <PhotoField
                id={`${subjectId}-selfie`}
                title="4. Selfie de tu cara"
                hint="De frente, con buena luz, sin lentes oscuros y sin taparte el rostro."
                selfie
                onChange={setSelfie}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Fotos JPG, PNG o WEBP · hasta 5 MB cada una · mínimo 100 × 100 px. En celulares
              compatibles podés usar la cámara.
            </p>
            <label className="flex items-start gap-3 text-xs leading-relaxed">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>
                Autorizo la revisión del DNI y la selfie para verificar la identidad de este
                profesional. Entiendo que esta es una prueba local con imágenes ficticias.
              </span>
            </label>
            <Button
              type="submit"
              disabled={!front || !back || !selfie || !consent || busy || Boolean(loadError)}
            >
              <Upload />
              {busy ? "Guardando carga…" : "Presentar documentación de prueba"}
            </Button>
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
        <LockKeyhole className="size-4 shrink-0" />
        El logo de una empresa no reemplaza la verificación individual de sus profesionales.
      </p>
    </section>
  );
}

export function IdentityReviewPanel() {
  const { records, error, ready } = useIdentityRecords();
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const record = records.find((item) => item.subjectId === selected);
  async function review(approved: boolean) {
    if (!record) return;
    setBusy(true);
    try {
      await setIdentityReview(record.subjectId, approved, reason);
      setSelected("");
      setReason("");
      toast.success(approved ? "Identidad aprobada en la demo" : "Se solicitó una nueva carga");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo revisar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface-panel p-5 sm:p-7">
      <h2 className="font-display text-xl font-semibold">Revisión de identidad</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        DNI y selfie de profesionales independientes y de empresas. Esta revisión manual es de
        prueba, sólo para cargas hechas en este navegador. No equivale a validación biométrica.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {!ready ? (
        <p className="mt-5">Cargando cargas locales…</p>
      ) : !records.length ? (
        <p className="mt-5 rounded-xl bg-secondary p-5 text-sm">
          Todavía no hay documentación cargada. Probá la verificación desde el panel profesional o
          desde Mis profesionales de una empresa.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {records.map((item) => (
            <div
              key={item.subjectId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  DNI terminado en {item.dni.slice(-3)} · {identityLabels[item.status]}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelected(item.subjectId);
                  setReason("");
                }}
              >
                Revisar documentación
              </Button>
            </div>
          ))}
        </div>
      )}
      {record && (
        <div className="mt-6 rounded-2xl border border-primary/30 p-5">
          <h3 className="font-semibold">
            {record.name} · DNI {record.dni}
          </h3>
          <div className="my-5 grid gap-4 md:grid-cols-3">
            {[
              { id: record.frontId, label: "Frente del DNI" },
              { id: record.backId, label: "Dorso del DNI" },
              { id: record.selfieId, label: "Selfie" },
            ].map((photo) => (
              <div key={photo.id}>
                <p className="mb-2 text-xs font-semibold">{photo.label}</p>
                <StoredImage
                  assetId={photo.id}
                  alt={photo.label}
                  className="h-56 w-full rounded-xl border border-border bg-muted object-contain"
                />
              </div>
            ))}
          </div>
          {record.status === "pending" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identity-review-reason">Motivo si pedís una nueva carga</Label>
                <Input
                  id="identity-review-reason"
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej.: La foto del dorso no se lee"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() => {
                    void review(true);
                  }}
                >
                  Aprobar identidad de prueba
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => {
                    void review(false);
                  }}
                >
                  Pedir nueva carga
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">
              {identityLabels[record.status]}
              {record.reason ? `: ${record.reason}` : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
