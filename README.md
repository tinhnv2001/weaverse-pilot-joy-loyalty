<h1 align="center">Weaverse Pilot × Joy Loyalty</h1>

<div align="center">

A reference Shopify Hydrogen storefront with the [Joy Loyalty](https://joy.so) headless integration installed end to end.

📘 [Joy on Hydrogen guide](https://help.joy.so/settings/developers/headless) · 🛠 [Joy Headless API](https://devdocs.joy.so/joy-headless-api/overview) · 🤖 [Joy agent skills](https://github.com/tinhnv2001/joy-loyalty-hydrogen-skills) · 🐞 [Report an issue](https://github.com/tinhnv2001/weaverse-pilot-joy-loyalty/issues)

</div>

This repository is [Weaverse Pilot](https://github.com/weaverse/pilot) (Hydrogen, React Router 7, Weaverse Studio) with Joy Loyalty added the way we recommend merchants and agencies add it. Use it to see the integration working on a real storefront, or to copy the pattern into your own Hydrogen project.

---

## What Joy adds

| Feature | Where it shows | Code |
|---|---|---|
| **Loyalty widget** (launcher + panel: earn, redeem, VIP tiers, referrals) | Every page | `<JoyProvider/>` + `<JoyWidget/>` in `app/root.tsx` |
| **Rewards page** | `/pages/rewards` | `app/routes/pages/rewards.tsx` (`<JoyLoyaltyPage/>`) |
| **Redeem in Cart** | Cart drawer | `app/components/cart/joy-redeem-cart.tsx` |
| **Point calculator** ("Earn X points") | Product page, cart drawer and `/cart` | `app/sections/main-product/buy-buttons/index.tsx`, `app/components/cart/joy-points-calculator.tsx` |
| **Weaverse blocks** — *Joy — Loyalty Launcher*, *Joy — Loyalty Page* | Weaverse Studio, drag and drop | `@joy-loyalty/weaverse-hydrogen`, registered in `app/weaverse/components.ts` |

Behind the scenes:

- **Customer sign-in** — `/api/joy-token` signs a short-lived token for the logged-in Shopify customer (Customer Account API), so members see their own balance, tier and rewards.
- **Server-side data** — the root loader calls `getJoyInitialData()` in parallel with the page's Storefront queries, so the widget renders without a loading flash.
- **Caching** — `app/entry.server.tsx` marks documents that embed member data as private and keeps guest pages cacheable.
- **CSP** — `joyCspDirectives()` is merged into the storefront's Content Security Policy.
- **Helper routes** — `/api/joy-products` feeds the widget's product sections (recently viewed, recommended); `/api/joy-place-order-scope` resolves earning programs limited to specific products or collections.

Design and texts come from Joy admin (**Branding**), so merchants change the look without a redeploy.

---

## Quick start

```bash
git clone https://github.com/tinhnv2001/weaverse-pilot-joy-loyalty my-storefront
cd my-storefront
cp .env.example .env   # demo store + demo Weaverse project
npm install
npm run dev            # → http://localhost:3456
```

`.env.example` ships working demo-store tokens, so the storefront renders immediately. Joy turns on once you add the Joy variables below.

### Connect Joy

Add these to `.env` (and to your Oxygen environment):

| Variable | Required | Value |
|---|---|---|
| `JOY_API_URL` | yes | `https://api.joy.so/app/api/v1/headless` |
| `JOY_SHOP_DOMAIN` | yes | Your **myshopify** domain, e.g. `your-store.myshopify.com` |
| `JOY_API_SECRET` | yes, for signed-in customers | Joy admin → **Settings → Manage keys → Headless secret** |
| `JOY_WIDGET_ASSET_URL` | no | Leave unset in production |

> [!IMPORTANT]
> Never prefix Joy variables with `PUBLIC_` — Hydrogen sends `PUBLIC_*` values to the browser. Keep `JOY_API_SECRET` out of git and mark it as secret in Oxygen.

Joy headless storefronts require the Joy **Ultimate** plan. Full setup and troubleshooting: [Install manually](https://help.joy.so/settings/developers/headless/install-manually).

---

## Add Joy to your own Hydrogen storefront

**With an AI coding agent (Claude Code, Cursor, Codex, …):**

```bash
npx skills add tinhnv2001/joy-loyalty-hydrogen-skills
```

Then ask your agent to use the skill for the part you need:

| Skill | Adds |
|---|---|
| `joy-headless-install` | Packages, environment, token route, root loader, widget, rewards page, CSP, caching |
| `joy-headless-redeem-cart` | Redeem in Cart in the cart drawer or cart page |
| `joy-headless-points-calculator` | Point calculator on the product page and in the cart |

**By hand:** follow the guides on help.joy.so —
[Joy on Hydrogen](https://help.joy.so/settings/developers/headless) ·
[Joy × Weaverse](https://help.joy.so/settings/developers/weaverse) ·
[Redeem in Cart](https://help.joy.so/on-site-content/cart-drawer/redeem-in-cart-headless) ·
[Point calculator](https://help.joy.so/on-site-content/product-page/point-calculator-headless).
The git history of this repo shows each step as its own commit.

---

## Packages

| Package | Version | Purpose |
|---|---|---|
| `@joy-loyalty/hydrogen` | ^0.4.0 | React components, server helpers and routes |
| `@joy-loyalty/sdk` | ^0.3.1 | Typed client for the Joy Headless API |
| `@joy-loyalty/weaverse-hydrogen` | ^0.2.0 | Joy blocks for Weaverse Studio |

`package.json` pins `@joy-loyalty/hydrogen` and `@joy-loyalty/sdk` through `overrides`, so the Weaverse blocks share the app's single copy (and its `JoyProvider` context). Keep the overrides when you upgrade.

---

## Development

```bash
npm run dev          # dev server + codegen on http://localhost:3456
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run biome:fix    # lint + format
npm run test         # unit tests
```

Run `npm run biome:fix && npm run typecheck` before committing. CI (`.github/workflows/ci.yml`) runs lint, typecheck, the Weaverse manifest and settings checks, and a production build on every pull request and every push to `main`.

Storefront base variables (`SESSION_SECRET`, `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, `WEAVERSE_PROJECT_ID`, customer account, analytics) are listed in [`.env.example`](.env.example). If your store is linked to a Hydrogen channel, `npx shopify hydrogen env pull` fills them in.

For Weaverse sections, theme settings, the PWA and the rest of the Pilot theme, see the [Weaverse docs](https://weaverse.io/docs) and [`AGENTS.md`](AGENTS.md).

---

## Deployment

Every push deploys to Shopify Oxygen through `.github/workflows/oxygen-deployment-*.yml`: `main` goes to production, other branches get a preview deployment. Add the Joy variables to the Oxygen environment first, with `JOY_API_SECRET` marked as secret.

> [!NOTE]
> If the Oxygen build fails with `JavaScript heap out of memory`, set `SHOPIFY_HYDROGEN_FLAG_SOURCEMAP: "false"` (and, if needed, `NODE_OPTIONS: --max-old-space-size=8192`) on the deploy step of that workflow.

---

## Credits and license

Built on [Weaverse Pilot](https://github.com/weaverse/pilot) by Weaverse. Joy Loyalty integration by the Joy team.
Licensed under [MIT](LICENSE.md). For issues with the Pilot theme itself, use the [upstream repository](https://github.com/weaverse/pilot/issues).
