import type { ClientPortfolio } from "./client-portfolio.ts";
// A separate namespace leaves the previous workspace examples intact, while
// every browser starts the customer experience without those records.
export const customerStorage = {
  operations: "oficios-customer-v1-operations",
  portfolio: "oficios-customer-v1-contacts",
  request: "oficios-customer-v1-last-request",
} as const;
export function emptyCustomerPortfolio(): ClientPortfolio {
  return { version: 1, clientId: "cliente-demo-1", jobs: [], conversations: {} };
}
