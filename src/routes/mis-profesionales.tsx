import { createFileRoute } from "@tanstack/react-router";
import { MarketLayout } from "@/components/market-common";
import { MarketJobList } from "@/components/market-jobs";
export const Route = createFileRoute("/mis-profesionales")({
  head: () => ({
    meta: [{ title: "Mis profesionales | Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <MarketLayout
      title="Mis profesionales"
      subtitle="Volvé a contactar a quienes ya trabajaron con vos."
    >
      <MarketJobList contacts />
    </MarketLayout>
  ),
});
