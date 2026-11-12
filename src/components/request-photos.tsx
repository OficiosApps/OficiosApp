import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoredImage } from "@/components/identity-verification";
import { removeRequestPhoto, saveRequestPhoto, validateImage } from "@/lib/demo-media";

export function RequestPhotos({
  photos,
  onChange,
  onBusy,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="request-photos" className="flex items-center gap-2">
          <ImagePlus className="size-4 text-primary" />
          Fotos del problema (opcional)
        </Label>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Podés adjuntar hasta 3 fotos. JPG, PNG o WEBP, máximo 5 MB por imagen. Las imágenes se
          guardan con tu pedido en este navegador.
        </p>
      </div>
      <Input
        id="request-photos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy || photos.length >= 3}
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (!files.length) return;
          if (photos.length + files.length > 3) {
            setError("Podés adjuntar hasta 3 fotos por solicitud.");
            return;
          }
          setBusy(true);
          onBusy(true);
          setError("");
          const added: string[] = [];
          try {
            await Promise.all(files.map((file) => validateImage(file, 5)));
            for (const file of files) added.push(await saveRequestPhoto(file));
            onChange([...photos, ...added]);
          } catch (error) {
            for (const id of added) await removeRequestPhoto(id).catch(() => {});
            setError(error instanceof Error ? error.message : "No se pudieron guardar las fotos.");
          } finally {
            setBusy(false);
            onBusy(false);
          }
        }}
      />
      {busy && (
        <p role="status" className="text-sm">
          Guardando fotos…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((id, index) => (
          <div key={id} className="rounded-xl border border-border p-2">
            <StoredImage
              assetId={id}
              alt={`Foto del problema ${index + 1}`}
              className="h-28 w-full rounded-lg object-cover"
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              className="mt-1 w-full"
              onClick={async () => {
                try {
                  await removeRequestPhoto(id);
                  onChange(photos.filter((photo) => photo !== id));
                } catch {
                  setError("No se pudo quitar la foto.");
                }
              }}
            >
              <Trash2 />
              Quitar foto
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Evitá incluir documentos de identidad o datos privados en las fotos del trabajo.
      </p>
    </div>
  );
}
