import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketLayout } from "@/components/market-common";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/como-funciona")({
  head: () => ({ meta: [{ title: "Cómo funciona | Oficios" }] }),
  component: () => (
    <MarketLayout
      title="Cómo funciona Oficios"
      subtitle="Del primer pedido al trabajo terminado, con todo en un lugar."
    >
      <ol className="grid gap-5 sm:grid-cols-2">
        {[
          [
            "Creá tu cuenta",
            "Ingresá con Google y elegí si necesitás contratar, ofrecés tu oficio o gestionás una empresa.",
          ],
          [
            "Contá qué necesitás",
            "Elegí oficio, ciudad y si preferís una visita planificada. La descripción y las fotos son opcionales.",
          ],
          [
            "Compará presupuestos",
            "Los prestadores con identidad aprobada de tu zona pueden responder. Revisá mano de obra, materiales, visita, plazo y garantía.",
          ],
          [
            "Contratá y coordiná",
            "Aceptá una propuesta, conversá con el profesional y confirmá día y hora. Cada cambio de precio requiere tu aceptación.",
          ],
          [
            "Seguí el trabajo",
            "Consultá si está solicitado, presupuestado, contratado, con visita confirmada, en curso o finalizado.",
          ],
          [
            "Conservá el contacto",
            "Encontrá tus contrataciones en Mis profesionales para volver a escribirle a alguien que ya trabajó con vos.",
          ],
        ].map(([title, text], index) => (
          <li key={title} className="surface-panel p-6">
            <span className="text-xs font-semibold text-primary">0{index + 1}</span>
            <h2 className="mt-3 font-display text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
      <section className="surface-panel mt-8 space-y-3 p-6">
        <h2 className="font-semibold">Si sos profesional o tenés una empresa</h2>
        <p className="text-sm text-muted-foreground">
          Completá tu oficio y zona, cargá la foto de perfil, DNI y selfie de verificación
          obligatorios, y esperá la revisión de una persona autorizada. Cargar los archivos no
          significa estar aprobado. Podés preparar tu perfil y portafolio mientras tanto.
        </p>
        <Button asChild variant="outline">
          <Link to="/soy-profesional">Crear mi cuenta profesional</Link>
        </Button>
      </section>
      <p className="mt-6 text-sm text-muted-foreground">
        Publicar pedidos y usar el Plan Inicial no tiene costo. Los pagos de trabajos se acuerdan
        directamente con el prestador. La disponibilidad y los plazos dependen de cada profesional.
      </p>
    </MarketLayout>
  ),
});
