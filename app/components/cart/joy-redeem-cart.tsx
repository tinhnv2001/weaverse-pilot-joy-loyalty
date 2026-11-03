import { JoyRedeemCart } from "@joy-loyalty/hydrogen";
import type { OptimisticCart } from "@shopify/hydrogen";
import { useFetcher, useRevalidator, useRouteLoaderData } from "react-router";
import type { CartApiQueryFragment } from "storefront-api.generated";
import { usePrefixPathWithLocale } from "~/hooks/use-prefix-path-with-locale";
import type { RootLoader } from "~/root";
import { useCartFetcherSync } from "./cart-sync";

// Joy "Redeem in Cart" block: points balance + redeemable rewards, applied to
// the cart through the standard CartForm actions on the cart route.
export function JoyCartRedeem({
  cart,
}: {
  cart: OptimisticCart<CartApiQueryFragment>;
}) {
  const data = useRouteLoaderData<RootLoader>("root");
  // Dedicated key so it never shares state with the drawer's own cart forms.
  const cartFetcher = useFetcher({ key: "joy-redeem-cart" });
  useCartFetcherSync(cartFetcher);
  const { revalidate } = useRevalidator();
  const cartRoute = usePrefixPathWithLocale("/cart");
  const loginUrl = usePrefixPathWithLocale("/account/login");

  if (!data?.joyApiUrl || !data.joyShopDomain) return null;

  return (
    <JoyRedeemCart
      apiUrl={data.joyApiUrl}
      shopDomain={data.joyShopDomain}
      assetUrl={data.joyAssetUrl ?? undefined}
      initialData={data.joy ?? null}
      cart={cart}
      cartFetcher={cartFetcher}
      cartRevalidate={revalidate}
      cartRoute={cartRoute}
      loginUrl={loginUrl}
      className="pb-4"
    />
  );
}
