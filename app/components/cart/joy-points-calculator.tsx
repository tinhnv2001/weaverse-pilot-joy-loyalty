import {
  JoyPointsCalculator,
  type JoyPointsCalculatorProps,
} from "@joy-loyalty/hydrogen";
import type { OptimisticCart } from "@shopify/hydrogen";
import { useRouteLoaderData } from "react-router";
import type { CartApiQueryFragment } from "storefront-api.generated";
import { usePrefixPathWithLocale } from "~/hooks/use-prefix-path-with-locale";
import type { RootLoader } from "~/root";

// Joy "Point calculator" for the cart: the points the whole cart earns,
// after discounts. Design and texts come from Joy admin (Branding > Point
// calculator); customer tags / B2B / isLoggedIn come from the root loader.
export function JoyCartPoints({
  cart,
}: {
  cart: OptimisticCart<CartApiQueryFragment>;
}) {
  const data = useRouteLoaderData<RootLoader>("root");
  const loginUrl = usePrefixPathWithLocale("/account/login");

  if (!data?.joyApiUrl || !data.joyShopDomain) {
    return null;
  }

  return (
    <JoyPointsCalculator
      apiUrl={data.joyApiUrl}
      shopDomain={data.joyShopDomain}
      assetUrl={data.joyAssetUrl ?? undefined}
      initialData={data.joy ?? null}
      context="cart"
      cart={cart as unknown as JoyPointsCalculatorProps["cart"]}
      customerTags={data.joyPoints?.customerTags}
      isB2B={data.joyPoints?.isB2B}
      isLoggedIn={data.joyPoints?.isLoggedIn}
      loginUrl={loginUrl}
      className="pb-4"
    />
  );
}
