import { createFileRoute } from "@tanstack/react-router";
import { MarketLayout } from "@/components/market-common";
import { MarketJobList } from "@/components/market-jobs";
export const Route = createFileRoute("/mis-solicitudes")({
  head: () => ({
    meta: [{ title: "Mis solicitudes | Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <MarketLayout title="Mis solicitudes">
      <MarketJobList />
    </MarketLayout>
  ),
});
