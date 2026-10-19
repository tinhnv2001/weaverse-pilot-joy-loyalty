import { JoyProvider, JoyWidget } from "@joy-loyalty/hydrogen";
import type { ReactNode } from "react";
import { useFetcher, useRevalidator, useRouteLoaderData } from "react-router";
import type { CartApiQueryFragment } from "storefront-api.generated";
import {
  getTimestampMs,
  recordCartMutation,
} from "~/components/cart/cart-baseline";
import { useCartFetcherSync } from "~/components/cart/cart-sync";
import { useCart, useCartStore } from "~/components/cart/store";
import { usePrefixPathWithLocale } from "~/hooks/use-prefix-path-with-locale";
import type { RootLoader } from "~/root";

const LOYALTY_PAGE_PATH = "/loyalty";

/**
 * Pushes a cart that Joy mutated (redeemed coupon, free gift) into the cart
 * store, with the same freshness guard as `useCartFetcherSync`.
 */
function syncJoyCart(cart: unknown) {
  const next = cart as CartApiQueryFragment | null | undefined;
  if (!(next?.id && next.lines)) {
    return;
  }
  recordCartMutation(next);
  const current = useCartStore.getState().serverCart;
  if (getTimestampMs(next.updatedAt) >= getTimestampMs(current?.updatedAt)) {
    useCartStore.setState({ serverCart: next });
  }
}

function openCartDrawer() {
  useCartStore.getState().open();
}

/**
 * Gives Joy Weaverse blocks (Joy — Loyalty Page) the storefront cart and the
 * handlers to sync it, so redeemed coupons land in the cart drawer.
 */
export function JoyCartProvider({ children }: { children: ReactNode }) {
  const cart = useCart();
  return (
    <JoyProvider
      cart={cart ?? undefined}
      onCartUpdated={syncJoyCart}
      onOpenCartDrawer={openCartDrawer}
    >
      {children}
    </JoyProvider>
  );
}

/**
 * The floating Joy loyalty launcher, rendered once on every page.
 */
export function JoyLoyaltyLauncher() {
  const data = useRouteLoaderData<RootLoader>("root");
  const cart = useCart();
  const joyCartFetcher = useFetcher();
  const joyRevalidator = useRevalidator();
  const cartRoute = usePrefixPathWithLocale("/cart");
  const loyaltyPageUrl = usePrefixPathWithLocale(LOYALTY_PAGE_PATH);
  const loginUrl = usePrefixPathWithLocale("/account");
  useCartFetcherSync(joyCartFetcher);

  if (!data?.joyApiUrl) {
    return null;
  }
  const locale = data.selectedLocale;
  return (
    <JoyWidget
      apiUrl={data.joyApiUrl}
      shopDomain={data.joyShopDomain ?? undefined}
      assetUrl={data.joyAssetUrl ?? undefined}
      initialData={data.joy ?? null}
      locale={locale?.language?.toLowerCase()}
      currency={locale?.currency}
      country={locale?.country}
      loginUrl={loginUrl}
      loyaltyPageUrl={loyaltyPageUrl}
      cart={cart ?? undefined}
      cartFetcher={joyCartFetcher}
      cartRevalidate={joyRevalidator.revalidate}
      cartRoute={cartRoute}
      onOpenCartDrawer={openCartDrawer}
    />
  );
}
