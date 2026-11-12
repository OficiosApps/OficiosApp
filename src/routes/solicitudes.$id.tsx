import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MarketLayout } from "@/components/market-common";
import { MarketJobDetail } from "@/components/market-jobs";
export const Route = createFileRoute("/solicitudes/$id")({
  validateSearch: z.object({ solicitud: z.string().optional() }),
  head: () => ({
    meta: [{ title: "Seguimiento y mensajes | Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});
function Page() {
  const { solicitud } = Route.useSearch();
  return (
    <MarketLayout title="Seguimiento del trabajo">
      <MarketJobDetail id={solicitud ?? ""} />
    </MarketLayout>
  );
}
