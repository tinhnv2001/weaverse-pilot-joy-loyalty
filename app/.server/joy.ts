import { getJoyInitialData } from "@joy-loyalty/hydrogen/server";
import type { AppLoadContext } from "react-router";

/**
 * Stands in for `context.customerAccount` so the root loader never resolves
 * the shopper. The SSR document must stay anonymous for Oxygen's full-page
 * cache (see app/utils/full-page-cache.ts); members get their points and tier
 * client-side, when the widget mints a token through /api/joy-token.
 */
const ANONYMOUS_CUSTOMER_ACCOUNT = {
  isLoggedIn: () => Promise.resolve(false),
  query: () => Promise.resolve({}),
};

/**
 * Loads the shop-wide Joy widget data (metafield blob) for the first paint.
 * Never throws: on failure the widget falls back to fetching live.
 */
export function loadJoyInitialData(context: AppLoadContext, request: Request) {
  const { env, storefront } = context;
  return getJoyInitialData({
    storefront,
    customerAccount: ANONYMOUS_CUSTOMER_ACCOUNT,
    apiUrl: env.JOY_API_URL ?? "",
    shopDomain: env.JOY_SHOP_DOMAIN ?? "",
    // Unused while the shopper is anonymous; kept so the call stays valid if
    // the real customerAccount is ever passed.
    secret: env.JOY_API_SECRET ?? "",
    locale: storefront.i18n.language.toLowerCase(),
    request,
  });
}
