import { createFileRoute } from "@tanstack/react-router";
import { MarketLayout } from "@/components/market-common";
export const Route = createFileRoute("/privacidad")({
  head: () => ({ meta: [{ title: "Privacidad | Oficios" }] }),
  component: () => (
    <MarketLayout title="Tus datos en Oficios">
      <div className="surface-panel max-w-3xl space-y-6 p-7 text-sm leading-relaxed">
        <section>
          <h2 className="mb-3 font-semibold">Cuenta y pedidos</h2>
          <p>
            Oficios usa el identificador y el correo de tu cuenta de Google para reconocer tu
            cuenta. Tu nombre, ciudad, oficio y datos de contacto se guardan para gestionar los
            servicios que solicitás u ofrecés. Oficios no recibe tu contraseña.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Qué se comparte</h2>
          <p>
            Los prestadores habilitados pueden ver pedidos de su oficio y ciudad. La dirección
            exacta y el teléfono del pedido sólo se comparten con el prestador contratado. Los
            mensajes quedan disponibles para el cliente y el profesional de esa conversación.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Identidad y fotografías</h2>
          <p>
            Los clientes deben enviar una selfie privada de verificación al crear su cuenta, sin
            DNI. Esta selfie no se muestra a los profesionales ni se publica como foto de perfil.
            Las cargas sin enviar vencen a las 24 horas y se eliminan cuando su titular vuelve a
            cargar una selfie. La foto de perfil del profesional se publica cuando se aprueba el
            alta. El DNI y la selfie de verificación son privados: pueden verlos su titular y las
            personas autorizadas para revisar identidades. La revisión es manual. Las fotos de
            trabajos se publican sólo cuando el profesional elige publicarlas y declara tener
            autorización del cliente cuando corresponda.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Ubicación de los pedidos</h2>
          <p>
            Si marcás un punto en el mapa, la ubicación exacta se mantiene privada para los
            profesionales hasta la contratación. La cuenta CEO puede consultarla para gestionar
            pedidos. La dirección escrita no se envía a un servicio externo de geocodificación. Los
            mosaicos del mapa se cargan desde OpenStreetMap.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Almacenamiento y asistente</h2>
          <p>
            Los registros se guardan en una base de datos del sitio y las imágenes en almacenamiento
            privado. El asistente de IA recibe únicamente lo que escribís en su chat; no accede a tu
            DNI, pedidos ni conversaciones con profesionales. No envíes documentos ni secretos al
            chat.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Control de tu información</h2>
          <p>
            Podés corregir tu perfil desde Mi cuenta, eliminar direcciones guardadas y retirar
            trabajos de tu portafolio público. Esta información describe el funcionamiento actual
            del servicio.
          </p>
        </section>
      </div>
    </MarketLayout>
  ),
});
