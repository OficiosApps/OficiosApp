import { createFileRoute } from "@tanstack/react-router";
import { MarketAccountPage } from "@/components/market-account";
export const Route = createFileRoute("/cuenta")({
  head: () => ({
    meta: [{ title: "Mi cuenta | Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: MarketAccountPage,
});
