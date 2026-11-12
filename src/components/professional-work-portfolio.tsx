import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StoredImage } from "@/components/identity-verification";
import { useServiceOperations } from "@/hooks/use-service-operations";
import { addPublishedWork, publishWork } from "@/lib/service-operations";
import { categorias, getProfesional } from "@/lib/mock-data";
import { localToday } from "@/lib/request-planning";
import { saveWorkPhoto } from "@/lib/demo-media";

export function ProfessionalWorkGallery({
  professionalId,
  manage = false,
}: {
  professionalId: string;
  manage?: boolean;
}) {
  const { state, ready, error, update } = useServiceOperations();
  const professional = getProfesional(professionalId)!;
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(professional.categorias[0]!);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [clientWork, setClientWork] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const works = state.works.filter(
    (work) =>
      work.professionalId === professionalId &&
      (manage || (work.published && (!work.clientWork || work.clientConsent))),
  );
  return (
    <section className="space-y-6">
      <div className="surface-panel p-6">
        <h2 className="font-display text-xl font-semibold">Portafolio de trabajos</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Fotos de antes y después, oficio, descripción y fecha. Sólo se muestran publicaciones
          autorizadas.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Portafolio local de demostración. La autorización es declarada por el profesional; no
          equivale a una autorización comprobada desde una cuenta de cliente.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      {manage && (
        <form
          key={formKey}
          className="surface-panel space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              update((state) =>
                addPublishedWork(state, {
                  id: crypto.randomUUID(),
                  professionalId,
                  title,
                  category,
                  date,
                  description,
                  beforeId: before,
                  afterId: after,
                  clientWork,
                  clientConsent: consent,
                  consentDeclaredAt: null,
                  published: false,
                }),
              );
              setTitle("");
              setDescription("");
              setBefore("");
              setAfter("");
              setConsent(false);
              setFormKey((key) => key + 1);
              toast.success("Trabajo guardado como borrador privado");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
            }
          }}
        >
          <h3 className="font-semibold">Agregar un trabajo</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="work-title">Título</Label>
              <Input
                id="work-title"
                required
                minLength={3}
                maxLength={100}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-date">Fecha del trabajo</Label>
              <Input
                id="work-date"
                type="date"
                required
                max={localToday()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-trade">Oficio</Label>
            <select
              id="work-trade"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {professional.categorias.map((slug) => (
                <option key={slug} value={slug}>
                  {categorias.find((category) => category.slug === slug)?.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-description">Descripción</Label>
            <Textarea
              id="work-description"
              required
              minLength={10}
              maxLength={1200}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "Antes", id: before, change: setBefore },
              { name: "Después", id: after, change: setAfter },
            ].map((photo) => (
              <div key={photo.name} className="space-y-3 rounded-xl border border-border p-4">
                <Label htmlFor={`work-photo-${photo.name}`}>Foto: {photo.name}</Label>
                {photo.id && (
                  <StoredImage
                    assetId={photo.id}
                    alt={photo.name}
                    className="h-36 w-full rounded-xl object-contain"
                  />
                )}
                <Input
                  id={`work-photo-${photo.name}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy > 0}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setBusy((count) => count + 1);
                    try {
                      photo.change(await saveWorkPhoto(file));
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "No se pudo guardar la imagen.",
                      );
                    } finally {
                      setBusy((count) => count - 1);
                    }
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WEBP · hasta 5 MB por foto. Evitá documentos, rostros y datos privados de
            clientes.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={clientWork}
              onChange={(event) => {
                setClientWork(event.target.checked);
                setConsent(false);
              }}
              className="mt-1 accent-primary"
            />
            El trabajo corresponde a un cliente
          </label>
          {clientWork && (
            <label className="flex items-start gap-3 rounded-xl bg-secondary p-4 text-xs leading-relaxed">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 accent-primary"
              />
              Declaro que cuento con autorización del cliente para publicar estas fotos y la
              descripción del trabajo.
            </label>
          )}
          <Button
            type="submit"
            disabled={!ready || busy > 0 || !before || !after || Boolean(error)}
          >
            {busy ? "Guardando fotos…" : "Guardar borrador privado"}
          </Button>
        </form>
      )}
      {!works.length ? (
        <p className="surface-panel p-8 text-sm text-muted-foreground">
          Todavía no hay trabajos {manage ? "guardados" : "publicados"} en este navegador.
        </p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {works.map((work) => (
            <article key={work.id} className="surface-panel space-y-4 p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">{work.title}</h3>
                <Badge variant="secondary">
                  {work.published ? "Publicado en la demo" : "Borrador privado"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {categorias.find((category) => category.slug === work.category)?.nombre} ·{" "}
                {work.date}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-xs font-semibold">Antes</p>
                  <StoredImage
                    assetId={work.beforeId}
                    alt={`Antes: ${work.title}`}
                    className="h-48 w-full rounded-xl object-contain"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold">Después</p>
                  <StoredImage
                    assetId={work.afterId}
                    alt={`Después: ${work.title}`}
                    className="h-48 w-full rounded-xl object-contain"
                  />
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {work.description}
              </p>
              {work.clientWork && (
                <p className="text-xs text-primary">
                  {work.clientConsent
                    ? "Autorización declarada por el profesional"
                    : "Falta autorización del cliente para publicar"}
                </p>
              )}
              {manage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={work.clientWork && !work.clientConsent}
                    onClick={() => {
                      try {
                        update((state) => publishWork(state, work.id));
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "No se pudo publicar.",
                        );
                      }
                    }}
                  >
                    {work.published ? "Retirar del perfil" : "Publicar en mi perfil"}
                  </Button>
                  {work.clientWork && !work.clientConsent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            "¿Confirmás que ahora contás con autorización del cliente para publicar estas imágenes?",
                          )
                        )
                          update((state) => ({
                            ...state,
                            works: state.works.map((item) =>
                              item.id === work.id
                                ? { ...item, clientConsent: true, consentDeclaredAt: Date.now() }
                                : item,
                            ),
                          }));
                      }}
                    >
                      Registrar autorización obtenida
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
