# Example integration snippets

Snippets for a React Router 7 Hydrogen storefront. Secrets are placeholders.

## .env
```bash
JOY_API_URL=https://api.joy.so/app/api/v1/headless
JOY_SHOP_DOMAIN=<store>.myshopify.com
JOY_API_SECRET=<Headless secret (hs_…) from Joy admin → Settings → Manage keys → Headless secret>   # server-only
# JOY_WIDGET_ASSET_URL=   # leave unset in prod (defaults to https://api.joy.so)
PUBLIC_CHECKOUT_DOMAIN=<store>.myshopify.com
```

## §1 Root loader (`app/root.tsx`)
```ts
import {getJoyInitialData} from '@joy-loyalty/hydrogen/server';

export async function loader(args: LoaderFunctionArgs) {
  const {env, storefront, customerAccount} = args.context;
  // ...existing critical/deferred data
  const joy = await getJoyInitialData({             // never throws
    storefront,
    customerAccount,
    apiUrl: env.JOY_API_URL ?? '',
    shopDomain: env.JOY_SHOP_DOMAIN ?? '',        // must be *.myshopify.com
    secret: env.JOY_API_SECRET ?? '',             // stays server-side
    locale: storefront.i18n.language.toLowerCase(), // Joy keys are lowercase
    request: args.request,
  });
  return {
    // ...existing
    joyApiUrl: env.JOY_API_URL ?? null,           // not a credential; browser calls it
    joyShopDomain: env.JOY_SHOP_DOMAIN ?? null,
    joyAssetUrl: env.JOY_WIDGET_ASSET_URL ?? null,
    joy,                                          // key name `joy` is read by Weaverse blocks
  };
}
```

## Root component
```tsx
import {JoyProvider, JoyWidget} from '@joy-loyalty/hydrogen';
import {useFetcher, useRevalidator} from 'react-router';

const joyCartFetcher = useFetcher();
const joyRevalidator = useRevalidator();
const joyCartRoute = usePrefixPathWithLocale('/cart'); // your locale helper

<main>
  <JoyProvider cart={cart ?? undefined} onCartUpdated={syncCartStore} onOpenCartDrawer={openCartDrawer}>
    {children}
  </JoyProvider>
</main>
<JoyWidget
  apiUrl={data?.joyApiUrl ?? null}
  shopDomain={data?.joyShopDomain ?? undefined}
  assetUrl={data?.joyAssetUrl ?? undefined}
  initialData={data?.joy ?? null}
  locale={locale.language?.toLowerCase()}
  currency={locale.currency}
  country={locale.country}
  cartFetcher={joyCartFetcher}
  cartRevalidate={joyRevalidator.revalidate}
  cartRoute={joyCartRoute}
  onOpenCartDrawer={openCartDrawer}
/>
```

## §2 `app/entry.server.tsx`
```tsx
import {joyCspDirectives, JOY_PERSONALIZED_CACHE_CONTROL, isJoyInitialDataPersonalized} from '@joy-loyalty/hydrogen';

const joyCsp = joyCspDirectives({apiUrl: context.env.JOY_API_URL, assetUrl: context.env.JOY_WIDGET_ASSET_URL});
const {nonce, header, NonceProvider} = createContentSecurityPolicy({
  scriptSrc: ["'self'", 'https://cdn.shopify.com', ...joyCsp.scriptSrc],
  connectSrc: ["'self'", ...joyCsp.connectSrc],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.shopify.com', ...joyCsp.styleSrc],
  imgSrc: ["'self'", 'data:', 'https://cdn.shopify.com', ...joyCsp.imgSrc],
  fontSrc: ["'self'", ...joyCsp.fontSrc],
  shop: {
    checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN || context.env.PUBLIC_STORE_DOMAIN,
    storeDomain: context.env.PUBLIC_STORE_DOMAIN,
  },
});
// ... render
const rootJoy = (reactRouterContext.staticHandlerContext.loaderData?.root as {joy?: any})?.joy;
if (isJoyInitialDataPersonalized(rootJoy)) {
  responseHeaders.set('Cache-Control', JOY_PERSONALIZED_CACHE_CONTROL); // private, no-store
} else {
  const fpc = getFullPageCacheControl(request, responseStatusCode); // see SKILL §10
  if (fpc) {
    responseHeaders.set('Oxygen-Cache-Control', fpc);
    if (!responseHeaders.has('Vary')) responseHeaders.set('Vary', 'Accept-Encoding');
  }
}
```
(Weaverse: spread your `getWeaverseCsp(request, context)` result first and concatenate each list.)

## §3 Token route (`app/routes/api.joy-token.ts`)
```ts
export {loader} from '@joy-loyalty/hydrogen/routes/joy-token';
```
Optional: `api.joy-products.ts` → `export {loader} from '@joy-loyalty/hydrogen/routes/joy-products';`,
`api.joy-place-order-scope.ts` → `export {loader} from '@joy-loyalty/hydrogen/routes/joy-place-order-scope';`.
With `routes.ts`: `...prefix('api', [route('joy-token', 'routes/api/joy-token.ts'), ...])`.

## §4 Loyalty page route, no Weaverse (`app/routes/($locale).pages.rewards.tsx`)
```tsx
import {getJoyLoyaltyPageData} from '@joy-loyalty/hydrogen/server';
import {JoyLoyaltyPage, isLoyaltyPageV2Enabled} from '@joy-loyalty/hydrogen';
import {useLoaderData, useRouteLoaderData, useFetcher, useRevalidator, useNavigate} from 'react-router';

export async function loader({context}: LoaderFunctionArgs) {
  const {env, storefront} = context;
  const data = await getJoyLoyaltyPageData({storefront, apiUrl: env.JOY_API_URL, shopDomain: env.JOY_SHOP_DOMAIN});
  return {data, apiUrl: env.JOY_API_URL, shopDomain: env.JOY_SHOP_DOMAIN, assetUrl: env.JOY_WIDGET_ASSET_URL ?? null};
}

export default function Rewards() {
  const {data, apiUrl, shopDomain, assetUrl} = useLoaderData<typeof loader>();
  const root = useRouteLoaderData('root') as {joy?: unknown; cart?: unknown} | undefined;
  const fetcher = useFetcher();
  const {revalidate} = useRevalidator();
  const navigate = useNavigate();
  if (!isLoyaltyPageV2Enabled(data)) return null;
  return (
    <JoyLoyaltyPage
      apiUrl={apiUrl} shopDomain={shopDomain} data={data}
      initialData={(root?.joy as any) ?? null}
      cartFetcher={fetcher} cartRevalidate={revalidate} cartRoute="/cart"
      onNavigate={(url) => navigate(url)}
      {...(assetUrl ? {assetUrl} : {})}
    />
  );
}
```

## §5 Weaverse (`app/weaverse/components.ts`)
```ts
import {joyComponents} from '@joy-loyalty/weaverse-hydrogen';
export const components: HydrogenComponent[] = [/* existing */, ...joyComponents];
```
