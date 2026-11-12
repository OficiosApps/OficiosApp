import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MarketLayout } from "@/components/market-common";
import { LiveProviderProfile } from "@/components/market-providers";
export const Route = createFileRoute("/profesionales/$id")({
  validateSearch: z.object({ perfil: z.string().optional() }),
  head: () => ({ meta: [{ title: "Perfil profesional | Oficios" }] }),
  component: Page,
});
function Page() {
  const { perfil } = Route.useSearch();
  return (
    <MarketLayout title="Perfil profesional">
      <LiveProviderProfile id={perfil ?? ""} />
    </MarketLayout>
  );
}
