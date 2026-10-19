---
name: joy-headless-install
description: Install Joy Loyalty (headless) into a merchant's Shopify Hydrogen storefront, optionally with Weaverse — env vars, root loader, CSP, personalized cache, /api/joy-token, <JoyWidget/>, cart wiring, Loyalty Page, Weaverse blocks, Oxygen deploy, verification. Use when asked to "install Joy on Hydrogen", "add Joy loyalty widget to Hydrogen/Weaverse", "install Joy headless", "integrate Joy into Hydrogen", "set up @joy-loyalty/hydrogen", or when debugging a Joy headless integration (joy-token 401 loops, CSP blocks, widget skeleton stuck).
---

# Joy headless install (Hydrogen / Weaverse)

> **Summary:** This skill guides an agent through installing Joy Loyalty into a Hydrogen
> storefront (with or without Weaverse): install the 3 packages `@joy-loyalty/sdk`, `@joy-loyalty/hydrogen`,
> (optional) `@joy-loyalty/weaverse-hydrogen`; declare the server-only env vars `JOY_API_URL`,
> `JOY_SHOP_DOMAIN`, `JOY_API_SECRET` (NO `PUBLIC_` prefix); call `getJoyInitialData` in
> the root loader; add CSP in `entry.server` and force `private, no-store` when data is
> personalized; mount the `/api/joy-token` route; render `<JoyWidget/>` + cart wiring;
> build the Loyalty Page via `getJoyLoyaltyPageData` + `<JoyLoyaltyPage/>` or a Weaverse block.
> `JOY_API_SECRET` = the shop's **Headless secret** (Settings → Manage keys → Headless secret,
> `hs_…`) — never the REST "Secret key".

See `references/fields.md` for every prop/option and `references/example-root.md`
for copy-ready snippets. Packages: `@joy-loyalty/hydrogen`, `@joy-loyalty/sdk`,
`@joy-loyalty/weaverse-hydrogen` on npm.

## 0. Go/no-go gate (ask before touching code)

1. **Secret.** Headless auth signs requests with the shop's **Headless secret**
   (Joy admin → Settings → Manage keys). The REST "Secret key" is not accepted (401).
   `JOY_API_SECRET` must be the Headless secret.
2. **Loyalty Page version.** `<JoyLoyaltyPage/>` renders only when
   `shop.loyaltyPageVersion === 'v2'` (Loyalty Page V2 enabled in Joy admin). Otherwise it renders nothing.
3. **Package version.** Use the latest `0.2.x` from npm (`@joy-loyalty/hydrogen` ≥ 0.2.1
   loads the widget core from `https://api.joy.so`; on 0.2.0 set `JOY_WIDGET_ASSET_URL=https://api.joy.so`).

## 1. Prerequisites and where values come from

| Need | Where the merchant gets it |
|---|---|
| Joy app installed on the store | Shopify App Store. Joy writes the storefront metafield `joy_loyalty_avada.data` that `getJoyInitialData` reads; no blob → widget still works via live fetch (slower). |
| `JOY_API_URL` | `https://api.joy.so/app/api/v1/headless`. Must include the `/app/api/v1/headless` path. |
| `JOY_SHOP_DOMAIN` | The **myshopify** domain (`x.myshopify.com`), NOT the Hydrogen hostname. |
| `JOY_API_SECRET` | Joy admin → **Settings → Manage keys → Headless secret** (`hs_…`; "Generate headless secret" if the card is empty — the backend also provisions one on the first token mint). NOT the REST "Secret key". "Revoke and regenerate" rotates it and invalidates every live customer token → update Oxygen env the same minute. |
| Customer Account API set up in Hydrogen | `context.customerAccount` must work (`PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SHOP_ID`). Without a session every shopper is a guest. |
| `JOY_WIDGET_ASSET_URL` (optional) | Only to override the widget-core CDN (default `https://api.joy.so`). Leave unset in production. |

## 2. Install

```bash
npm i @joy-loyalty/hydrogen @joy-loyalty/sdk            # core (dompurify comes as a dependency of @joy-loyalty/hydrogen)
npm i @joy-loyalty/weaverse-hydrogen            # only on Weaverse storefronts
```
Peer deps: `@shopify/hydrogen >=2025.5`, React 18/19, `react-router ^7` (weaverse pkg also `@weaverse/hydrogen ^5.19.2`).

## 3. Env vars

Add to `.env` (local) and to **Oxygen → Storefront settings → Environment variables** (deploy).
**Never prefix with `PUBLIC_`** — Vite ships `PUBLIC_*` to the browser. Mark `JOY_API_SECRET` as secret in Oxygen.
Extend the `Env` type (`env.d.ts`) with `JOY_API_URL`, `JOY_SHOP_DOMAIN`, `JOY_API_SECRET`, `JOY_WIDGET_ASSET_URL?`.
`JOY_API_URL` / `JOY_SHOP_DOMAIN` are not credentials: pass them to the client explicitly through the root loader.

## 4. Mount resource routes

`app/routes/api.joy-token.ts` (or `routes.ts` entry `route("joy-token", ...)` under `prefix("api")`):
```ts
export {loader} from '@joy-loyalty/hydrogen/routes/joy-token';
```
It reads `context.customerAccount` + the 3 env vars, mints a JWT, answers
`{token, tokenType, expiresIn, firstName?}` with `Cache-Control: private, no-store`.
Errors: `500 missing_env`, `401 not_logged_in|customer_unresolved`, `502 upstream_*`, `401/502 exchange_failed`.

Optional (widget degrades gracefully without them):
- `api.joy-products.ts` → `export {loader} from '@joy-loyalty/hydrogen/routes/joy-products';` (Recently viewed / Recommended sections; uses `context.storefront`).
- `api.joy-place-order-scope.ts` → `export {loader} from '@joy-loyalty/hydrogen/routes/joy-place-order-scope';` (place_order programs restricted to products/collections; needs `JOY_API_URL` + `JOY_SHOP_DOMAIN`, no secret).

Weaverse package re-exports `routes/joy-token` and `routes/joy-place-order-scope` — same code, either import works. Keep the default path `/api/joy-token` unless you also pass `tokenRoute`.

## 5. Root loader — `getJoyInitialData`

In `app/root.tsx` loader (import from `@joy-loyalty/hydrogen/server`), call it with
`storefront`, `customerAccount`, `apiUrl`, `shopDomain`, `secret`, `locale`
(lowercased `storefront.i18n.language`), `request`. Return it under the key **`joy`**
(the Weaverse block reads `useRouteLoaderData('root').joy`, and `.cart` as a cart fallback).
Also return `joyApiUrl`, `joyShopDomain`, `joyAssetUrl` for the client. Never throws.
Leave `exposeToken` off (it puts a live JWT into SSR HTML). Snippet: `references/example-root.md` §1.

## 6. `entry.server.tsx` — CSP + personalized cache

- `joyCspDirectives({apiUrl: env.JOY_API_URL, assetUrl: env.JOY_WIDGET_ASSET_URL})` →
  merge **all five** lists (`scriptSrc`, `connectSrc`, `styleSrc`, `imgSrc`, `fontSrc`) into
  `createContentSecurityPolicy`. Merging only `connectSrc` drops Joy scripts, images and fonts
  in enforce mode. Merchant-uploaded images on `cdn.shopify.com` also need `imgSrc`.
- Set `shop.checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN || env.PUBLIC_STORE_DOMAIN`.
- If `isJoyInitialDataPersonalized(loaderData.root.joy)` → `Cache-Control: JOY_PERSONALIZED_CACHE_CONTROL`
  (`private, no-store`) and **do not** set `Oxygen-Cache-Control`. The root loader runs on
  every route, so this applies site-wide for logged-in members. Snippet: example-root §2.

## 7. `<JoyWidget/>` in the root Layout/App

Render once, outside `<main>`, inside the Router:
```tsx
const joyCartFetcher = useFetcher();
const joyRevalidator = useRevalidator();
<JoyWidget apiUrl={data?.joyApiUrl ?? null} shopDomain={data?.joyShopDomain ?? undefined}
  assetUrl={data?.joyAssetUrl ?? undefined} initialData={data?.joy ?? null}
  locale={locale.language?.toLowerCase()} currency={locale.currency} country={locale.country}
  cartFetcher={joyCartFetcher} cartRevalidate={joyRevalidator.revalidate}
  cartRoute={localePrefixedCartPath} onOpenCartDrawer={openCartDrawer} />
```
Every prop (defaults, fallbacks) is in `references/fields.md` §JoyWidget. Key points:
- `apiUrl={null}` disables everything but the fallback launcher.
- `position`, `accentColor`, `launcherLabel` are intentionally undefaulted: leave them unset so the merchant's Joy-admin widget branding wins; set them only to override.
- `preload`: `'idle'` (default, Liquid parity) / `'interaction'` (best perf, slower first open) / `'eager'`.
- There is **no** `appearance` prop — styling comes from the Joy admin widget editor via the blob.
- `cartFetcher` + `cartRevalidate` are both required for cart mutations (auto-apply coupon, free-gift add-to-cart). Without them cart actions degrade to `cart-unavailable` (the code is shown, not applied).
- `cartRoute` must be locale-aware (`/fr-ca/cart`); default `/cart`. Your cart route action must accept the standard Hydrogen `CartForm` actions.

## 8. Loyalty Page

**Plain Hydrogen** — a route (e.g. `pages.rewards.tsx` or `($locale).rewards.tsx`):
loader → `getJoyLoyaltyPageData({storefront, apiUrl, shopDomain})` (no customer data, cacheable per D2);
component → `<JoyLoyaltyPage apiUrl shopDomain data initialData={rootJoy} cart* onCartUpdated onOpenCartDrawer onNavigate/>`.
Guard with `isLoyaltyPageV2Enabled(data)`. `sectionId` renders a single section. Snippet: example-root §4.
Make the widget's `loyaltyPageUrl` point to this route (default `/pages/rewards`).

**Weaverse** — see §9; the `joy-loyalty-page` block does the loader + render itself.

## 9. Weaverse registration

In `app/weaverse/components.ts`:
```ts
import {joyComponents, JoyLoyaltyWidget} from '@joy-loyalty/weaverse-hydrogen';
export const components = [ ...existing, ...joyComponents /*, JoyLoyaltyWidget (optional) */ ];
```
- `joyComponents` contains **only** `joy-loyalty-page` ("Joy — Loyalty Page", setting `sectionId`: `all` or one of 15 sections).
  0.2.0 removed 8 old blocks (`joy-vip-tiers`, `joy-ways-to-earn`, ...); pages using them stop rendering — re-add Loyalty Page.
- `joy-loyalty-widget` ("Joy — Loyalty Launcher") is exported but NOT in `joyComponents`; register it explicitly only if you want an in-page launcher block. Don't combine it with `<JoyWidget/>` in root unless intentional (two launchers).
- Block loaders read `weaverse.env.JOY_API_URL / JOY_SHOP_DOMAIN / JOY_WIDGET_ASSET_URL`; missing → Studio shows "Set the JOY_API_URL and JOY_SHOP_DOMAIN...".
- The block can't reach your cart: wrap `<main>` children in `<JoyProvider cart={cart} onCartUpdated={syncCart} onOpenCartDrawer={openDrawer}>`; otherwise it falls back to `root.cart`, then self-loads `/cart`.
- Allow Weaverse Studio hosts in CSP and exclude preview params (`weaverseHost`, `isDesignMode`, `__revisionId`, ...) from full-page caching.

## 10. Full-page cache rules (Oxygen)

Only opt a document into `Oxygen-Cache-Control` when ALL hold:
GET + 200; root `joy` not personalized; no `session=` cookie (cache key ignores cookies → guest HTML
would be replayed to a member, widget shows "Sign in"); path segment (after optional locale) not in
`account, api, cart, discount, graphiql, subrequest-profiler`; no Weaverse preview params. Also set `Vary`.
Note: RR7 single-fetch `.data` requests bypass `handleRequest` — add the same check in any `handleDataRequest`.

## 11. Deploy to Oxygen

1. Add env vars per environment (Preview + Production) in Oxygen; `JOY_API_SECRET` as secret.
2. Point production at `https://api.joy.so/...`; never ship a tunnel/localhost `JOY_API_URL` or `JOY_WIDGET_ASSET_URL`.
3. `shopify hydrogen deploy` (or the GitHub integration). Nothing to deploy on the Joy side.

## 12. Verify

Guest (incognito):
- [ ] Launcher appears; `api.joy.so` core loads (idle) — no CSP violations in console.
- [ ] `GET /api/joy-token` → 401 `not_logged_in` **once**, then no repeats (guest route is memoised).
- [ ] Sign-in CTA goes to the login route; loyalty page renders guest sections.
- [ ] Document response has `Oxygen-Cache-Control` only on cacheable paths.
Member:
- [ ] Response `Cache-Control: private, no-store`, no `Oxygen-Cache-Control`.
- [ ] `/api/joy-token` 200 `{token, expiresIn}`; then `Authorization: Bearer` calls to `JOY_API_URL/customer...`.
- [ ] Points/tier match Joy admin; redeem → coupon auto-applied to cart (cart wiring) and drawer opens.
- [ ] Switch locale (`/fr/...`) → Joy texts in that language.

## 13. Common errors → fixes

| Symptom | Cause / fix |
|---|---|
| `/api/joy-token` 500 `missing_env` | Env var missing in that Oxygen environment / `.env`. |
| 401 `customer_unresolved` or `exchange_failed` for a logged-in member | Wrong `JOY_API_SECRET` (rotated?), `JOY_SHOP_DOMAIN` not myshopify, or email mismatch. Repeated 401 loops → check the secret first. |
| 502 `upstream_unreachable` | `JOY_API_URL` wrong/unreachable (tunnel died, missing `/app/api/v1/headless`). |
| Widget stuck on skeleton / "[joy] failed to load the widget core" | Core URL unreachable or blocked by `script-src`; stale `JOY_WIDGET_ASSET_URL` pointing at a dead local server. |
| Images/icons missing, CSP report on `img-src`/`font-src` | Merge all `joyCspDirectives` lists, plus `cdn.shopify.com` for images. |
| Hydrogen analytics/consent error | `PUBLIC_CHECKOUT_DOMAIN` unset → set it (defaults to myshopify domain). |
| Build: cannot resolve `dompurify` | Install it explicitly (`npm i dompurify`) when your package manager doesn't hoist `@joy-loyalty/hydrogen`'s dependency (pnpm/PnP). |
| Package upgrade doesn't show | Stale Vite prebundle: reinstall, `rm -rf node_modules/.vite`, restart dev. |
| Member sees guest UI after login | Cached guest document served — full-page cache rules §10 / session-cookie guard. |
| Wrong language | `locale` not passed / not lowercased (`storefront.i18n.language` is `EN`). |
| Loyalty Page block empty | Shop is on Loyalty Page V1 (`isLoyaltyPageV2Enabled` false) or env missing. |

## 14. Security notes

- `JOY_API_SECRET` = shop **Headless secret** (see §0) — server-only; never log, never `PUBLIC_`, never `exposeToken: true` without a reason.
- `shopDomain` for server routes comes only from env, never from request input.
- Any response embedding root `joy` for a member must be `private, no-store`.
- Customer JWT TTL is ~60 min; client refreshes via `/api/joy-token` on 401.
