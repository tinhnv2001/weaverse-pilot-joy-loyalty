import { getJoyInitialData } from "@joy-loyalty/hydrogen/server";
import type { AppLoadContext } from "react-router";

/**
 * Loads the Joy widget data for the first paint: the shop-wide metafield blob,
 * plus the signed-in customer when there is a Customer Account session.
 * Never throws: on failure the widget falls back to fetching live.
 *
 * Pass the REAL `context.customerAccount`. Do not stub it to keep the document
 * anonymous for the full-page cache: the widget reads "no customer in SSR +
 * cached Joy token" as a logout and clears the token, so the signed-in member
 * is never sent with `isEarnSignup` and never earns sign-up points.
 * Documents that carry customer data are kept out of the shared cache in
 * app/entry.server.tsx and app/utils/full-page-cache.ts.
 */
export function loadJoyInitialData(context: AppLoadContext, request: Request) {
  const { env, storefront, customerAccount } = context;
  return getJoyInitialData({
    storefront,
    customerAccount,
    apiUrl: env.JOY_API_URL ?? "",
    shopDomain: env.JOY_SHOP_DOMAIN ?? "",
    secret: env.JOY_API_SECRET ?? "",
    locale: storefront.i18n.language.toLowerCase(),
    request,
  });
}
