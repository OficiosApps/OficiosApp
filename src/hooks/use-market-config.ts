import { useRemote } from "@/hooks/use-market";
import type { PublicConfig } from "@/lib/market-config";
export function useMarketConfig() {
  const remote = useRemote<PublicConfig>("/config", true);
  return {
    ...remote,
    cities: (remote.data?.regions ?? []).map((r) => ({
      ...r,
      nombre: r.name,
      provincia: r.province,
    })),
  };
}
