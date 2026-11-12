export type MapPoint = { lat: number; lng: number };
export type MarketPlan = {
  id: string;
  name: string;
  priceCents: number;
  published: boolean;
  quoteLimit: number | null;
  maxPaymentMethods: number;
  benefits: string[];
};
export type MarketRegion = {
  id: string;
  name: string;
  province: string;
  status: "preparacion" | "activa" | "pausada";
  center: MapPoint;
};
export type ReferralPolicy = {
  enabled: boolean;
  rewardQuotes: number;
  maxRewardsPerReferrer: number;
  description: string;
};
export type CommercialConfig = {
  plans: MarketPlan[];
  regions: MarketRegion[];
  referrals: ReferralPolicy;
};
export type PublicConfig = {
  plans: MarketPlan[];
  regions: MarketRegion[];
  referrals: ReferralPolicy;
  billingEnabled: boolean;
};
export type MarketEntitlements = {
  planId: string | null;
  planName: string;
  quoteLimit: number | null;
  usedQuotes: number;
  bonusQuotes: number;
  availableQuotes: number | null;
  maxPaymentMethods: number;
  month: string;
  monthStart: number;
  monthEnd: number;
};
