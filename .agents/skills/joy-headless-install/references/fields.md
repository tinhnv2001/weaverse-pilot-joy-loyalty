# Joy headless — field reference

For package versions 0.2.x.

## Import paths (package.json `exports`)

| Import | Gives |
|---|---|
| `@joy-loyalty/hydrogen` | `JoyWidget`, `JoyLoyaltyPage`, `isLoyaltyPageV2Enabled`, `JoyProvider` + hooks, `joyCspDirectives`, `JOY_CSP_DIRECTIVES`, `JOY_API_ORIGIN`, `JOY_CDN_ORIGIN`, `JOY_PERSONALIZED_CACHE_CONTROL`, `isJoyInitialDataPersonalized`, `loadWidgetCore`, `preconnectWidgetCore`, `getJoyToken`, `clearJoyToken`, `DEFAULT_TOKEN_ROUTE`, formatting helpers |
| `@joy-loyalty/hydrogen/server` | `getJoyInitialData`, `getJoyLoyaltyPageData`, cache-control helpers |
| `@joy-loyalty/hydrogen/csp` | CSP constants/function only |
| `@joy-loyalty/hydrogen/provider`, `/token`, `/points`, `/money`, `/image`, `/social-earn`, `/facebook-ref-link`, `/metafield-blob`, `/place-order-scope` | Sub-modules |
| `@joy-loyalty/hydrogen/routes/joy-token` \| `/joy-place-order-scope` \| `/joy-products` | Resource-route `loader`s |
| `@joy-loyalty/sdk` (`.`, `/server`, `/client`, `/ports`, `/widget-contracts`, `/loyalty-page-contracts`, `/headless-loyalty-page-client`, `/host`) | Low-level API client — not needed for a standard install |
| `@joy-loyalty/weaverse-hydrogen` | `joyComponents`, `JoyLoyaltyPage` (block module), `JoyLoyaltyWidget` (block module), `JoyProvider`, `useJoyConfig`, `useJoyCustomer`, `getJoyToken`, `clearJoyToken`, `DEFAULT_TOKEN_ROUTE` |
| `@joy-loyalty/weaverse-hydrogen/routes/joy-token` \| `/joy-place-order-scope` | Re-exports of the `@joy-loyalty/hydrogen` routes |

## Env vars

| Name | Req | Read by | Meaning |
|---|---|---|---|
| `JOY_API_URL` | yes | joy-token route, place-order-scope route, Weaverse block loaders, your root loader | Headless API base incl. `/app/api/v1/headless`. Prod `https://api.joy.so/app/api/v1/headless`. Not secret, but don't prefix `PUBLIC_`; pass to client via loader. |
| `JOY_SHOP_DOMAIN` | yes | same | myshopify domain. Server routes take shop ONLY from here. |
| `JOY_API_SECRET` | yes for members | joy-token route, `getJoyInitialData` via `mintJoyToken` | Shop **Headless secret** (`hs_…`, Joy admin → Settings → Manage keys → Headless secret; NOT the REST "Secret key"). Signs `HMAC(customerId-email-ts)` and, optionally, the `x-joy-server-signature` header. Server-only. Guests work without it. |
| `JOY_WIDGET_ASSET_URL` | no | your root loader → `assetUrl`; Weaverse loader | Override widget-core origin; default `https://api.joy.so`. Normally leave unset. |
| `PUBLIC_CHECKOUT_DOMAIN` | Hydrogen | `entry.server` CSP `shop.checkoutDomain` | Hydrogen analytics/consent; fallback `PUBLIC_STORE_DOMAIN`. |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SHOP_ID` | Hydrogen | `context.customerAccount` | Required for member identity. |

## `getJoyInitialData(options)`

| Option | Type | Req | Default | Notes |
|---|---|---|---|---|
| `storefront` | `context.storefront` | yes | — | Reads metafield `joy_loyalty_avada.data` (blob, beat 1). |
| `customerAccount` | `context.customerAccount` | yes | — | Mints token when logged in. |
| `apiUrl` | string | yes | — | `JOY_API_URL`. |
| `shopDomain` | string | yes | — | `JOY_SHOP_DOMAIN`. |
| `secret` | string | yes | — | `JOY_API_SECRET` (Headless secret); never returned/logged. |
| `locale` | string | no | — | Lowercased Shopify language (`en`, `vi`); passed through. |
| `loginUrl` / `registerUrl` / `accountUrl` | string | no | `/account/login`, `/account/register`, `/account` | Echoed as `login_url`/`register_url`/`account_url`. |
| `request` | Request | no | page `{type:'index'}` | Used only to derive `page`. |
| `exposeToken` | boolean | no | false | Puts JWT in SSR payload — avoid. |

Result: `blob?`, `customer?` (points/tier), `shopifyCustomer?` (name/email), `token?`, `locale?`, `login_url`, `register_url`, `account_url`, `page`. Never throws; failures → fields absent.

## `getJoyLoyaltyPageData(options)`

| Option | Type | Req | Notes |
|---|---|---|---|
| `storefront` | `context.storefront` | yes | Blob read + per-request memo key (N blocks → 1 fetch). |
| `apiUrl` | string | yes | Calls `GET /loyalty-page/structure?shop=`. |
| `shopDomain` | string | yes | |
| `fetch` | fetch | no | Custom fetch (testing). |

Result `JoyLoyaltyPageData`: `structure?`, `faqs?`, `translations`, `shop` (incl. `loyaltyPageVersion`), `home?`, `country?`, `locale?`. No customer data (cache-safe).

## `<JoyWidget/>`

| Prop | Type | Default | What it does |
|---|---|---|---|
| `apiUrl` | string \| null | `null` | Headless API base; `null` disables balance/live data. |
| `tokenRoute` | string | `/api/joy-token` | Same-origin token route. |
| `loginUrl` | string | `/account` | Guest CTA target. |
| `loyaltyPageUrl` | string | `/pages/rewards` | "View rewards" target. |
| `locale` | string | shop primary | Joy text + number formatting. |
| `shopDomain` | string | blob `shop.shopifyDomain` | Needed for beat-2 `getInfo` when no SSR blob. myshopify, not host. |
| `position` | `'bottom-right'\|'bottom-left'` | unset → admin branding, fallback `bottom-right` | Explicit value overrides Joy admin. |
| `accentColor` | string | unset → admin branding | Launcher color override. |
| `launcherLabel` | string | unset → admin branding | |
| `panelHeading` | string | `'Your rewards'` | Fallback panel only. |
| `pointsLabel` | string | `'points'` | Fallback panel only. |
| `viewRewardsLabel` | string | `'View rewards'` | Fallback panel only. |
| `loginLabel` | string | `'Log in'` | Fallback panel only. |
| `initialData` | `getJoyInitialData` result \| null | `null` | SSR first paint; with blob the real core builders paint. |
| `assetUrl` | string | Joy CDN | Core URL override (`JOY_WIDGET_ASSET_URL`). |
| `preload` | `'idle'\|'interaction'\|'eager'` | `'idle'` | When to fetch the ~160-220KB core. |
| `cart` | cart \| () => cart | — | Current Storefront cart. |
| `cartFetcher` | `useFetcher()` | — | Required with `cartRevalidate` for cart mutations. |
| `cartRevalidate` | `useRevalidator().revalidate` | — | |
| `cartRoute` | string | `/cart` | Locale-aware cart action route. |
| `onOpenCartDrawer` | () => void | → `JoyProvider.onOpenCartDrawer` → click `cartDrawerButtonSelector` | `open_cart_drawer` apply behavior. |
| `currency` | ISO code | cart currency → `USD` | Product-card prices. |
| `country` | ISO-2 | `US` | Free-gift stock by market. |

No `appearance`/theme prop exists.

## `<JoyLoyaltyPage/>`

| Prop | Type | Req | Notes |
|---|---|---|---|
| `apiUrl` | string | yes | |
| `shopDomain` | string | yes | |
| `data` | `JoyLoyaltyPageData` | yes | From `getJoyLoyaltyPageData`. |
| `tokenRoute` | string | no | default `/api/joy-token`. |
| `sectionId` | string | no | One section only: `hero, inlineBanner, howItWorks, earn, redeem, tiers, referral, faq, redeemProgram, myRewards, activity, accountDashboard, referralManagement, walletPass, linkAccounts`. |
| `assetUrl` | string | no | |
| `cart`, `cartFetcher`, `cartRevalidate`, `cartRoute` | as JoyWidget | no | Enable redeem-dialog cart total + auto-apply. |
| `onCartUpdated` | (cart) => void | no | Push mutated cart to host store (also `joy:cart-updated` window event). |
| `onOpenCartDrawer` | () => void | no | |
| `onNavigate` | (url) => void | no | `useNavigate()`; else full page load. |
| `initialData` | root `joy` | no | Client-only customer seed for first paint. |

`isLoyaltyPageV2Enabled(data)` → `data.shop.loyaltyPageVersion === 'v2'`.

## `<JoyProvider/>`

Optional context for blocks: `apiUrl`, `tokenRoute`, `loginUrl`, `locale`, `shopDomain`, `cart`, `onCartUpdated`, `onOpenCartDrawer`, `children`. Hooks: `useJoyConfig`, `useJoyCustomer`, `useJoyProviderCart`, `useJoyProviderCartHandlers`.

## Routes

| Route loader | Env | Response |
|---|---|---|
| `routes/joy-token` | 3 vars | 200 `{token, tokenType, expiresIn, firstName?}`; errors `missing_env` 500, `not_logged_in` 401, `customer_unresolved` 401, `upstream_unreachable` 502, `upstream_bad_response` 502, `exchange_failed` 401/502. Always `private, no-store`. |
| `routes/joy-place-order-scope` | URL + domain | Eligible products for place_order program. |
| `routes/joy-products` | uses `context.storefront` | Product cards for recently viewed / recommended / promoted collections. |

## CSP / cache

- `JOY_CSP_DIRECTIVES`: script/style/img/font/connect = `https://api.joy.so` (widget core and API share the origin; deduped).
- `joyCspDirectives({apiUrl?, assetUrl?})`: same, derived from actual origins; bad URL → defaults.
- `JOY_PERSONALIZED_CACHE_CONTROL = 'private, no-store'`; `isJoyInitialDataPersonalized(joy)` true if `customer|shopifyCustomer|token` present.

## Token helpers

`getJoyToken({tokenRoute?, force?})` → cached JWT (sessionless memory/storage) or `null` for guest (a guest 401 is memoised per route); `clearJoyToken()` on logout.

## `@joy-loyalty/sdk` (advanced)

`createJoyClient({apiUrl, token?, shopDomain?, onTokenExpired?, fetch?, locale?})`. `onTokenExpired` is called once on 401 then retried — wire to `() => getJoyToken({force: true})`.
`createHeadlessLoyaltyPageClient({apiUrl, shop, getToken, locale?, fetch?, openUrl?})`.

## Weaverse blocks

| Block | Registered by | Settings |
|---|---|---|
| `joy-loyalty-page` ("Joy — Loyalty Page") | `joyComponents` | `sectionId` select, default `all`. Loader env: `JOY_API_URL`, `JOY_SHOP_DOMAIN`, `JOY_WIDGET_ASSET_URL`. Reads root loader `joy` + `cart`, `JoyProvider` cart handlers. |
| `joy-loyalty-widget` ("Joy — Loyalty Launcher") | manual (`JoyLoyaltyWidget`) | `launcherLabel` 'Rewards', `panelHeading` 'Your rewards', `pointsLabel` 'points', `viewRewardsLabel` 'View rewards', `loyaltyPageUrl` '/pages/rewards', `loginLabel` 'Log in', `loginUrl` '/account', `position` 'bottom-right', `accentColor`. |
