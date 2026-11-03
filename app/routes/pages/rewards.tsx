import {
  isLoyaltyPageV2Enabled,
  type JoyLoyaltyPageInitialData,
  JoyLoyaltyPage,
} from "@joy-loyalty/hydrogen";
import { getJoyLoyaltyPageData } from "@joy-loyalty/hydrogen/server";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useRouteLoaderData,
} from "react-router";
import { useCartFetcherSync } from "~/components/cart/cart-sync";
import { useCartStore } from "~/components/cart/store";
import { usePrefixPathWithLocale } from "~/hooks/use-prefix-path-with-locale";
import type { RootLoader } from "~/root";

export const meta: MetaFunction = () => [{ title: "Rewards" }];

export async function loader({ context }: LoaderFunctionArgs) {
  const { env, storefront } = context;
  // Shop-level config only (no customer data); member state comes from root `joy`.
  const data = await getJoyLoyaltyPageData({
    storefront,
    apiUrl: env.JOY_API_URL,
    shopDomain: env.JOY_SHOP_DOMAIN,
  });
  return {
    data,
    apiUrl: env.JOY_API_URL,
    shopDomain: env.JOY_SHOP_DOMAIN,
    assetUrl: env.JOY_WIDGET_ASSET_URL ?? null,
  };
}

export default function RewardsPage() {
  const { data, apiUrl, shopDomain, assetUrl } = useLoaderData<typeof loader>();
  const root = useRouteLoaderData<RootLoader>("root");
  const serverCart = useCartStore((state) => state.serverCart);
  const openCartDrawer = useCartStore((state) => state.open);
  const fetcher = useFetcher();
  useCartFetcherSync(fetcher);
  const { revalidate } = useRevalidator();
  const navigate = useNavigate();
  const cartRoute = usePrefixPathWithLocale("/cart");

  if (!isLoyaltyPageV2Enabled(data)) {
    return null;
  }
  return (
    <JoyLoyaltyPage
      apiUrl={apiUrl}
      shopDomain={shopDomain}
      data={data}
      initialData={(root?.joy as JoyLoyaltyPageInitialData | undefined) ?? null}
      cart={(serverCart ?? undefined) as never}
      cartFetcher={fetcher}
      cartRevalidate={revalidate}
      cartRoute={cartRoute}
      onCartUpdated={(cart) =>
        useCartStore.setState({ serverCart: cart as typeof serverCart })
      }
      onOpenCartDrawer={openCartDrawer}
      onNavigate={(url) => navigate(url)}
      {...(assetUrl ? { assetUrl } : {})}
    />
  );
}
