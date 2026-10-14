import { route } from "@/lib/server/http";
import { nativePrices } from "@/lib/server/market";

export const revalidate = 60;

/** USD prices of SOL, ETH and BNB for the cost estimate. */
export const GET = route(async () => ({ prices: await nativePrices() }));
