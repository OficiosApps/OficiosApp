import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketLayout } from "@/components/market-common";

export const Route = createFileRoute("/condiciones")({
  head: () => ({ meta: [{ title: "Términos y condiciones | Oficios" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketLayout
      title="Términos y condiciones"
      subtitle="Cómo usamos Oficios, qué acordamos al contratar y cómo atendemos los reclamos."
    >
      <article className="surface-panel max-w-3xl space-y-8 p-6 text-sm leading-relaxed sm:p-8">
        <p className="text-xs text-muted-foreground">
          Versión del 12 de noviembre de 2026 · Argentina
        </p>

        <div className="rounded-xl border border-border p-4">
          <p className="font-semibold">Atención y reclamos de Oficios</p>
          <a
            href="mailto:pqroficiosapp@gmail.com?subject=Reclamo%20por%20servicio%20en%20Oficios"
            className="mt-2 inline-block break-all text-primary underline"
          >
            pqroficiosapp@gmail.com
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            Conservá una copia del correo enviado y sus archivos adjuntos.
          </p>
        </div>

        <section aria-labelledby="terms-purpose">
          <h2 id="terms-purpose" className="mb-3 font-display text-lg font-semibold">
            1. Alcance de la plataforma
          </h2>
          <p>
            Oficios conecta a clientes con profesionales y empresas para solicitar servicios,
            recibir presupuestos, organizar visitas, conversar y conservar el historial de los
            trabajos. Estas condiciones regulan el uso de la aplicación y el compromiso de atención
            de reclamos de Oficios. El presupuesto aceptado detalla las obligaciones concretas de
            cada servicio.
          </p>
          <p className="mt-3">
            La participación de profesionales y empresas no elimina las obligaciones ni la
            responsabilidad que puedan corresponder a Oficios por su propia actividad y por la
            normativa aplicable.
          </p>
        </section>

        <section aria-labelledby="terms-account">
          <h2 id="terms-account" className="mb-3 font-display text-lg font-semibold">
            2. Registro, identidad y seguridad
          </h2>
          <p>
            Para contratar u ofrecer servicios se requiere tener al menos 18 años y capacidad para
            contratar, brindar datos veraces y mantener el control de la cuenta. El ingreso se
            realiza con la cuenta de Google; Oficios no recibe su contraseña. No se permite
            compartir accesos, suplantar identidades ni crear perfiles con documentación ajena.
          </p>
          <p className="mt-3">
            Los clientes deben presentar una selfie privada de verificación, sin DNI. Los
            profesionales deben presentar foto de perfil, DNI y selfie privada. La habilitación de
            los prestadores está sujeta a revisión manual. Esa revisión no certifica antecedentes
            penales, aptitud técnica, matrícula ni ausencia de riesgos. Cada prestador debe contar
            con las habilitaciones que su actividad requiera. Las empresas deben identificar a los
            integrantes asignados a cada trabajo y organizar su actividad.
          </p>
        </section>

        <section aria-labelledby="terms-contract">
          <h2 id="terms-contract" className="mb-3 font-display text-lg font-semibold">
            3. Pedidos, presupuestos y ejecución
          </h2>
          <p>
            El cliente describe la necesidad, indica la ubicación del servicio y elige un
            presupuesto. La descripción ampliada, las fotografías y la ubicación en el mapa son
            opcionales. La publicación del pedido no garantiza disponibilidad ni contratación. El
            presupuesto debe identificar el trabajo, mano de obra, materiales, visita, importe,
            plazo y garantía ofrecida. Todo cambio de alcance o precio requiere aceptación del
            cliente antes de ejecutarse o cobrarse.
          </p>
          <p className="mt-3">
            Las visitas y los horarios se coordinan entre las partes. El prestador debe respetar el
            domicilio y los bienes del cliente, trabajar de forma segura e informar riesgos y
            demoras. El cliente debe facilitar el acceso acordado e informar condiciones del lugar
            relevantes para la seguridad. Confirmar el cierre del trabajo no implica renunciar a
            reclamar defectos, incidentes o daños detectados después.
          </p>
        </section>

        <section aria-labelledby="terms-payments">
          <h2 id="terms-payments" className="mb-3 font-display text-lg font-semibold">
            4. Pagos, comprobantes y planes profesionales
          </h2>
          <p>
            El pago del servicio se acuerda directamente con el prestador por los medios que éste
            haya informado. Oficios no procesa ni custodia ese dinero. El prestador es responsable
            de emitir los comprobantes que correspondan. El cliente debe conservar el presupuesto,
            la aceptación y los comprobantes de pago.
          </p>
          <p className="mt-3">
            Las suscripciones son exclusivamente para profesionales. Los precios, beneficios y
            límites vigentes se muestran en los planes. El plan inicial es gratuito. Mientras no
            esté habilitada la facturación, la selección de un plan pago no genera un cargo ni
            autoriza débitos. Los beneficios por referidos se rigen por las condiciones informadas
            al participar y no equivalen a dinero salvo que se informe expresamente lo contrario.
          </p>
        </section>

        <section
          id="reclamos"
          aria-labelledby="terms-claims"
          className="rounded-2xl border border-primary/20 bg-secondary/50 p-5 sm:p-6"
        >
          <h2 id="terms-claims" className="mb-3 font-display text-xl font-semibold">
            5. Reclamos por robos, hurtos, daños e incidentes: resolución en 60 días
          </h2>
          <p>
            Oficios se compromete a recibir, investigar y resolver los reclamos por presuntos robos,
            hurtos, daños materiales u otros incidentes vinculados con un servicio contratado a
            través de la aplicación, dentro de un plazo máximo de{" "}
            <strong>60 días corridos desde la recepción del reclamo</strong>. Si una norma exige
            actuar en un plazo menor, prevalece ese plazo.
          </p>
          <p className="mt-3">
            El plazo comienza con la primera comunicación que permita identificar al reclamante, el
            servicio y el hecho informado. Pedir documentación adicional no reinicia el cómputo. Los
            60 días constituyen el plazo de resolución asumido por Oficios; no limitan el momento en
            que puede ocurrir o denunciarse un hecho ni acortan los plazos legales para reclamar.
          </p>
          <p className="mt-3">
            La resolución debe incluir una respuesta fundada y las medidas concretas que
            correspondan al caso. Cuando corresponda reparar un perjuicio atribuible al servicio o a
            Oficios, éste se hará cargo de la reparación, reposición o compensación aplicable,
            informando por escrito al cliente la solución, su alcance y cómo se hará efectiva dentro
            del plazo indicado. Un acuse de recibo, una derivación al profesional o la intervención
            de terceros no constituyen por sí solos una solución ni suspenden automáticamente este
            compromiso.
          </p>
          <p className="mt-3">
            La presentación del reclamo no determina por sí sola la autoría del hecho ni implica una
            indemnización automática por cualquier incidente. Se evaluarán su vinculación con el
            servicio, los antecedentes disponibles y el perjuicio, con participación del cliente.
            Esta evaluación no puede imponerle una renuncia de derechos ni una carga de prueba
            contraria a la ley. El compromiso lo asume Oficios; no se ofrece como una póliza de
            seguro ni se afirma que exista una aseguradora contratada.
          </p>
          <p className="mt-3">
            El vencimiento de los 60 días no cierra el reclamo, no libera a los responsables ni
            obliga al cliente a aceptar una propuesta. El cliente puede acudir a las autoridades o
            iniciar las acciones que correspondan en cualquier momento, sin esperar ese plazo.
          </p>
        </section>

        <section aria-labelledby="terms-report">
          <h2 id="terms-report" className="mb-3 font-display text-lg font-semibold">
            6. Presentación y seguimiento del reclamo
          </h2>
          <p className="mb-3">
            Enviá tu reclamo a{" "}
            <a
              href="mailto:pqroficiosapp@gmail.com?subject=Reclamo%20por%20servicio%20en%20Oficios"
              className="break-all text-primary underline"
            >
              pqroficiosapp@gmail.com
            </a>
            . El plazo se cuenta desde que la comunicación llega a esa casilla, sin esperar su
            lectura o una respuesta de confirmación. Si un mensaje es rechazado o devuelto, conservá
            el aviso y volvé a intentar el envío; esto no limita las demás vías de reclamo que te
            correspondan.
          </p>
          <p>
            Al presentar un reclamo, indicá tu nombre y un contacto de respuesta, el pedido o
            servicio involucrado, la fecha aproximada y una descripción del incidente. Aportá,
            cuando los tengas, mensajes, fotografías, presupuestos, comprobantes y demás
            antecedentes útiles. La falta inicial de algún documento no impide recibir el reclamo.
            Oficios debe dejar constancia de su recepción y mantener informado al cliente sobre las
            actuaciones y la solución.
          </p>
          <p className="mt-3">
            Si el hecho pudiera constituir un delito, podés denunciarlo ante la policía o la
            fiscalía y conservar la constancia. La atención inicial de Oficios no depende de una
            condena penal ni exige que primero negocies con la persona denunciada. Ante un peligro
            inmediato, priorizá tu seguridad y contactá a los servicios de emergencia locales: la
            aplicación y su asistente no son servicios de emergencia.
          </p>
          <p className="mt-3">
            El chat de Ayuda IA orienta sobre el uso de Oficios; no recibe denuncias formales, no
            abre expedientes ni decide compensaciones. No envíes DNI, selfies, claves ni datos
            sensibles al asistente.
          </p>
        </section>

        <section aria-labelledby="terms-cancel">
          <h2 id="terms-cancel" className="mb-3 font-display text-lg font-semibold">
            7. Cancelaciones y derechos del consumidor
          </h2>
          <p>
            Las cancelaciones deben comunicarse y dejar constancia de su motivo. Cualquier cargo,
            anticipo o condición de devolución debe informarse antes de la aceptación y ajustarse a
            la ley. Se mantienen el derecho de revocación en las contrataciones a distancia, cuando
            corresponda, las garantías legales y el derecho a reclamar por incumplimientos. Ni la
            finalización del trabajo, ni el pago, ni la baja de la cuenta eliminan esos derechos.
          </p>
        </section>

        <section aria-labelledby="terms-privacy">
          <h2 id="terms-privacy" className="mb-3 font-display text-lg font-semibold">
            8. Datos personales, imágenes y comunicaciones
          </h2>
          <p>
            El tratamiento de los datos se explica en la{" "}
            <Link to="/privacidad" className="text-primary underline">
              información de privacidad
            </Link>
            . El DNI y las selfies de verificación son privados. La foto de perfil profesional puede
            publicarse después de la aprobación. Las imágenes de domicilios, personas o trabajos
            sólo deben publicarse con autorización cuando corresponda. Los datos obtenidos para un
            servicio no pueden usarse para hostigar, difundir información privada ni realizar
            contactos ajenos a la contratación sin autorización.
          </p>
        </section>

        <section aria-labelledby="terms-conduct">
          <h2 id="terms-conduct" className="mb-3 font-display text-lg font-semibold">
            9. Conductas prohibidas y medidas de seguridad
          </h2>
          <p>
            Se prohíben el fraude, los robos, las amenazas, la discriminación, la difusión de datos
            sin autorización, la documentación falsa y la oferta de actividades ilegales. Ante
            indicios de abuso, Oficios podrá adoptar medidas proporcionadas para proteger a las
            personas, preservar antecedentes o restringir accesos, informando el motivo cuando
            corresponda. Estas medidas no sustituyen la investigación de las autoridades ni eliminan
            reclamos o pagos pendientes.
          </p>
        </section>

        <section aria-labelledby="terms-changes">
          <h2 id="terms-changes" className="mb-3 font-display text-lg font-semibold">
            10. Vigencia y cambios
          </h2>
          <p>
            La versión y fecha se identifican al comienzo de este documento. Las modificaciones
            deben informarse antes de aplicarse. No alteran retroactivamente presupuestos aceptados,
            beneficios ya comprometidos o reclamos iniciados, ni se interpretan como una renuncia a
            derechos adquiridos. Las nuevas condiciones que requieran aceptación deben ponerse a
            disposición de forma clara.
          </p>
        </section>

        <section aria-labelledby="terms-law">
          <h2 id="terms-law" className="mb-3 font-display text-lg font-semibold">
            11. Legislación y vías de reclamo
          </h2>
          <p>
            Se aplica la legislación argentina, incluida la normativa de defensa del consumidor y
            protección de datos que corresponda a cada relación. Ninguna cláusula limita
            responsabilidades impuestas por la ley. Los usuarios conservan el acceso a Defensa del
            Consumidor y a las autoridades y tribunales competentes, sin obligación de arbitraje ni
            renuncia al fuero que legalmente les corresponda.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Referencias oficiales:{" "}
            <a
              href="https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Ley 24.240
            </a>{" "}
            y{" "}
            <a
              href="https://www.argentina.gob.ar/normativa/nacional/ley-26994-235975/actualizacion"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Código Civil y Comercial
            </a>
            .
          </p>
        </section>
      </article>
    </MarketLayout>
  );
}
