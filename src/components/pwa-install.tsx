import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const prompt = useRef<InstallPrompt | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [device, setDevice] = useState<"ios" | "android" | "desktop">("desktop");
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const checkInstalled = () =>
      setInstalled(
        display.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
    checkInstalled();
    setDevice(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
        ? "ios"
        : /Android/.test(navigator.userAgent)
          ? "android"
          : "desktop",
    );
    const available = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
      setCanInstall(true);
    };
    const complete = () => {
      setInstalled(true);
      setOpen(false);
      prompt.current = null;
      setCanInstall(false);
    };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", complete);
    display.addEventListener("change", checkInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", complete);
      display.removeEventListener("change", checkInstalled);
    };
  }, []);

  async function install() {
    const pending = prompt.current;
    if (!pending) return;
    setBusy(true);
    setMessage("");
    try {
      await pending.prompt();
      const choice = await pending.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Instalación solicitada. Cuando aparezca el ícono de Oficios, abrilo desde tu pantalla de inicio o tus aplicaciones."
          : "Podés instalarla más adelante desde el menú del navegador.",
      );
    } catch {
      setMessage("Usá el menú de tu navegador y seguí los pasos que aparecen abajo.");
    } finally {
      prompt.current = null;
      setCanInstall(false);
      setBusy(false);
    }
  }

  if (installed) return null;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-5 gap-2"
        onClick={() => setOpen(true)}
      >
        <Download className="size-4" aria-hidden="true" />
        Instalar Oficios
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Llevá Oficios a tu pantalla de inicio</DialogTitle>
            <DialogDescription>
              Abrila desde su ícono y probá la aplicación en tu dispositivo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-xl bg-secondary p-4">
            <img src="/icons/icon-192.png" alt="" className="size-12 rounded-xl" />
            <div>
              <p className="font-semibold">Oficios</p>
              <p className="text-xs text-muted-foreground">Tus servicios, siempre a mano</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Abrí el enlace directamente en el navegador de tu dispositivo. Si lo estás viendo dentro
            de ChatGPT, usá “Abrir en el navegador” o copiá el enlace a Chrome o Safari.
          </p>
          {canInstall && (
            <Button type="button" disabled={busy} onClick={() => void install()}>
              {busy ? "Esperando al navegador…" : "Instalar aplicación"}
            </Button>
          )}
          {message && (
            <p role="status" className="text-sm text-primary">
              {message}
            </p>
          )}
          {device === "ios" ? (
            <ol className="list-decimal space-y-3 pl-5 text-sm">
              <li>Abrí Oficios en Safari e iniciá sesión si te lo pide.</li>
              <li>Tocá Compartir y elegí “Agregar a pantalla de inicio”.</li>
              <li>Si aparece “Abrir como app web”, activalo. Confirmá con “Agregar”.</li>
              <li>Volvé a tu pantalla de inicio y tocá el ícono de Oficios.</li>
            </ol>
          ) : device === "android" ? (
            <ol className="list-decimal space-y-3 pl-5 text-sm">
              <li>Abrí Oficios en Chrome e iniciá sesión si te lo pide.</li>
              <li>
                Tocá el menú de los tres puntos y elegí “Instalar aplicación” o “Agregar a pantalla
                principal”.
              </li>
              <li>Confirmá la instalación y abrí Oficios desde su ícono.</li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-3 pl-5 text-sm">
              <li>Abrí Oficios en Chrome o Edge e iniciá sesión si te lo pide.</li>
              <li>
                Buscá la opción de instalar en la barra de direcciones o en el menú del navegador.
              </li>
              <li>Confirmá la instalación y abrí Oficios desde tus aplicaciones.</li>
            </ol>
          )}
          <p className="text-xs text-muted-foreground">
            Necesitás conexión para ingresar, cargar fotos, enviar pedidos y conversar. La
            instalación conserva los permisos de tu cuenta.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
