import { createFileRoute } from "@tanstack/react-router";
import { MarketLayout } from "@/components/market-common";
import { LiveAddresses } from "@/components/market-addresses";
export const Route = createFileRoute("/mis-direcciones")({
  head: () => ({
    meta: [{ title: "Mis direcciones | Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <MarketLayout
      title="Mis direcciones"
      subtitle="Casa, comercio y otras propiedades para completar tus pedidos con un clic."
    >
      <LiveAddresses />
    </MarketLayout>
  ),
});
