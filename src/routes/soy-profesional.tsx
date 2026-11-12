import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { MarketAccountPage } from "@/components/market-account";
export const Route = createFileRoute("/soy-profesional")({
  validateSearch: z.object({ referido: z.string().optional() }),
  head: () => ({ meta: [{ title: "Soy profesional | Oficios" }] }),
  component: Page,
});

function Page() {
  const { referido } = Route.useSearch();
  return <MarketAccountPage professional referralCode={referido ?? ""} />;
}
