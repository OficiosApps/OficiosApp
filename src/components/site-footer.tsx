import { PwaInstall } from "@/components/pwa-install";
import { Link } from "@tanstack/react-router";
import { useMarket } from "@/hooks/use-market";
import { Wrench } from "lucide-react";
export function SiteFooter() {
  const { session } = useMarket();
  const provider = session.account?.kind === "profesional" || session.account?.kind === "empresa";
  const panel =
    session.account?.kind === "empresa"
      ? ("/panel-empresa" as const)
      : ("/panel-profesional" as const);
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Link to="/" className="flex items-center gap-2 font-display font-semibold">
            <Wrench className="size-5 text-primary" />
            Oficios
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Un lugar para resolver lo que necesita tu casa o tu comercio.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">{provider ? "Tu espacio profesional" : "Tu espacio"}</p>
          {provider ? (
            <ul className="mt-3 space-y-3 text-muted-foreground">
              <li>
                <Link to={panel}>Mi panel</Link>
              </li>
              <li>
                <Link to="/cuenta">Mi perfil y DNI</Link>
              </li>
              <li>
                <Link to="/metodos-de-pago">Mis métodos de cobro</Link>
              </li>
            </ul>
          ) : (
            <ul className="mt-3 space-y-3 text-muted-foreground">
              <li>
                <Link to="/cuenta">{session.account ? "Mi cuenta" : "Ingresar"}</Link>
              </li>
              <li>
                <Link to="/mis-solicitudes">Mis solicitudes</Link>
              </li>
              <li>
                <Link to="/mis-profesionales">Mis profesionales</Link>
              </li>
              <li>
                <Link to="/mis-direcciones">Mis direcciones</Link>
              </li>
            </ul>
          )}
        </div>
        <div className="text-sm">
          <p className="font-semibold">Empezá por acá</p>
          <ul className="mt-3 space-y-3 text-muted-foreground">
            <li>
              <Link to="/categorias">Explorar oficios</Link>
            </li>
            <li>
              <Link to={provider ? panel : "/solicitud"}>
                {provider ? "Mi panel profesional" : "Pedir un servicio"}
              </Link>
            </li>
            <li>
              <Link to="/como-funciona">Cómo funciona</Link>
            </li>
            <li>
              <Link to="/soy-profesional">Soy profesional</Link>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Link to="/privacidad">Privacidad</Link>
            <Link to="/condiciones">Términos y condiciones</Link>
            <a href="mailto:pqroficiosapp@gmail.com?subject=Reclamo%20por%20servicio%20en%20Oficios">
              Reclamos
            </a>
          </div>
          <PwaInstall />
          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Oficios.
          </p>
        </div>
      </div>
    </footer>
  );
}
