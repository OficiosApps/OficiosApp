import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MarketErrorText, MarketNotice } from "@/components/market-common";
import { useMarket } from "@/hooks/use-market";
import { marketApi, fileUrl } from "@/lib/market-client";

export function ClientSelfieCapture({ onChange }: { onChange: (id: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const stop = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stop();
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    if (camera && video.current) video.current.srcObject = stream.current;
  }, [camera]);
  async function start() {
    setError("");
    setBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Usá el botón de cámara de tu dispositivo que aparece abajo.");
      stop();
      const feed = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (!alive.current) {
        feed.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = feed;
      setCamera(true);
    } catch {
      setError(
        "No pudimos abrir la cámara. Revisá el permiso o usá la cámara de tu dispositivo abajo.",
      );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function upload(file: File) {
    onChange("");
    setError("");
    setBusy(true);
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error("Usá una selfie JPG, PNG o WEBP de hasta 5 MB.");
      const form = new FormData();
      form.set("file", file);
      const result = await marketApi<{ id: string }>("/client-selfie", {
        method: "POST",
        body: form,
      });
      if (alive.current) {
        setPreview(URL.createObjectURL(file));
        onChange(result.id);
      }
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "No pudimos guardar la selfie.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function capture() {
    const feed = video.current;
    if (!feed?.videoWidth) {
      setError("Esperá a que se vea la imagen de la cámara.");
      return;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(feed.videoWidth, feed.videoHeight));
    canvas.width = Math.round(feed.videoWidth * scale);
    canvas.height = Math.round(feed.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(feed, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    stop();
    setCamera(false);
    if (blob) await upload(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
    else setError("No pudimos tomar la foto. Intentá nuevamente.");
  }
  return (
    <section className="space-y-4 rounded-xl border border-border p-5">
      <h3 className="font-semibold">Selfie de verificación obligatoria</h3>
      <p className="text-sm text-muted-foreground">
        Mostrá tu cara completa, con buena luz y sin taparla. No te pedimos DNI. Tu selfie es
        privada: sólo vos y el equipo autorizado de revisión pueden verla.
      </p>
      {camera && (
        <div className="space-y-3">
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            aria-label="Vista de tu cámara frontal"
            className="max-h-80 w-full rounded-xl bg-black"
            style={{ transform: "scaleX(-1)" }}
          />
          <Button type="button" disabled={busy} onClick={() => void capture()}>
            Tomar selfie
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stop();
              setCamera(false);
            }}
          >
            Cerrar cámara
          </Button>
        </div>
      )}
      {!camera && (
        <Button type="button" variant="outline" disabled={busy} onClick={() => void start()}>
          {preview ? "Volver a tomar selfie" : "Abrir cámara frontal"}
        </Button>
      )}
      {!camera && (
        <label className="block space-y-2 text-sm">
          <span>También podés usar la cámara de tu dispositivo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            disabled={busy}
            className="block w-full text-xs"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {preview && (
        <figure>
          <img
            src={preview}
            alt="Tu selfie privada para revisión"
            className="h-44 w-44 rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-muted-foreground">
            Selfie cargada. Completá el formulario para enviarla a revisión.
          </figcaption>
        </figure>
      )}
      {busy && (
        <p role="status" className="text-sm">
          Preparando tu selfie…
        </p>
      )}
      <MarketErrorText error={error} />
      <p className="text-xs text-muted-foreground">
        La revisión es manual. La captura no realiza reconocimiento facial ni prueba de vida
        automática.
      </p>
    </section>
  );
}

export function ClientSelfieSubmission() {
  const { session, refresh } = useMarket();
  const account = session.account!;
  const [selfieId, setSelfieId] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replace, setReplace] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await marketApi("/client-verification", {
        method: "POST",
        body: JSON.stringify({ selfieId, consent, version: account.version }),
      });
      await refresh();
      setReplace(false);
      setSelfieId("");
      setConsent(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos enviar la selfie.");
    } finally {
      setBusy(false);
    }
  }
  const hasSelfie = Boolean(account.identity?.["clientSelfieId"]);
  return (
    <section className="surface-panel space-y-4 p-6">
      <h2 className="font-display text-xl font-semibold">Tu verificación de cliente</h2>
      {hasSelfie && (
        <>
          <MarketNotice>
            {account.verification === "aprobado"
              ? "Selfie revisada y aprobada."
              : account.verification === "rechazado"
                ? "Necesitamos que vuelvas a tomar tu selfie."
                : "Selfie recibida. Pendiente de revisión manual."}
          </MarketNotice>
          <img
            src={fileUrl(account.identity["clientSelfieId"])}
            alt="Tu selfie privada"
            className="h-36 w-36 rounded-xl object-cover"
          />
          {account.identity["review"]?.reason && (
            <p className="text-sm">{account.identity["review"].reason}</p>
          )}
        </>
      )}
      {hasSelfie && !replace && account.verification !== "rechazado" ? (
        <Button type="button" variant="outline" onClick={() => setReplace(true)}>
          Actualizar mi selfie
        </Button>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ClientSelfieCapture onChange={setSelfieId} />
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Autorizo el almacenamiento privado y la revisión manual de mi selfie para verificar mi
              cuenta.
            </span>
          </label>
          <Button disabled={busy || !selfieId || !consent}>
            {busy ? "Enviando…" : "Enviar selfie a revisión"}
          </Button>
        </form>
      )}
      <MarketErrorText error={error} />
    </section>
  );
}
