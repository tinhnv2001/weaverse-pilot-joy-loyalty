import {
  isJoyInitialDataPersonalized,
  JOY_PERSONALIZED_CACHE_CONTROL,
  joyCspDirectives,
} from "@joy-loyalty/hydrogen";
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from "@shopify/hydrogen";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { getFullPageCacheControl } from "~/utils/full-page-cache";
import { getWeaverseCsp } from "~/weaverse/csp";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const weaverseCsp = getWeaverseCsp(request, context);
  // Joy Loyalty: the widget core and API share https://api.joy.so. All five
  // lists are needed, or Joy scripts, images and fonts break in enforce mode.
  const joyCsp = joyCspDirectives({
    apiUrl: context.env?.JOY_API_URL,
    assetUrl: context.env?.JOY_WIDGET_ASSET_URL,
  });
  const { nonce, header, NonceProvider } = createContentSecurityPolicy({
    ...weaverseCsp,
    scriptSrc: [...(weaverseCsp.scriptSrc as string[]), ...joyCsp.scriptSrc],
    connectSrc: [...(weaverseCsp.connectSrc as string[]), ...joyCsp.connectSrc],
    styleSrc: [...(weaverseCsp.styleSrc as string[]), ...joyCsp.styleSrc],
    // img-src and font-src were inherited from default-src; declaring them
    // for Joy must keep those sources or merchant images and fonts break.
    imgSrc: [
      "'self'",
      "https://cdn.shopify.com",
      "https://shopify.com",
      ...(weaverseCsp.defaultSrc as string[]),
      ...joyCsp.imgSrc,
    ],
    fontSrc: [
      "'self'",
      "https://cdn.shopify.com",
      "https://shopify.com",
      ...(weaverseCsp.defaultSrc as string[]),
      ...joyCsp.fontSrc,
    ],
    shop: {
      checkoutDomain:
        context.env?.PUBLIC_CHECKOUT_DOMAIN || context.env?.PUBLIC_STORE_DOMAIN,
      storeDomain: context.env?.PUBLIC_STORE_DOMAIN,
    },
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get("user-agent"))) {
    await Promise.race([
      body.allReady,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  }

  responseHeaders.set("Content-Type", "text/html");
  // TODO: change to Content-Security-Policy when you ready with your CSP configs.
  responseHeaders.set("Content-Security-Policy-Report-Only", header);
  // Opt anonymous document responses into Oxygen's full-page cache. Both
  // headers are required by Oxygen; responses that commit a session cookie
  // (Set-Cookie in server.ts) are excluded by Oxygen automatically. See
  // app/utils/full-page-cache.ts for the gating rules.
  //
  // The root loader keeps Joy data anonymous (app/.server/joy.ts). If it ever
  // carries customer data, the document must not be shared.
  const rootJoy = (
    reactRouterContext.staticHandlerContext.loaderData?.root as
      | { joy?: Parameters<typeof isJoyInitialDataPersonalized>[0] }
      | undefined
  )?.joy;
  const fullPageCacheControl = isJoyInitialDataPersonalized(rootJoy)
    ? null
    : getFullPageCacheControl(request, responseStatusCode);
  if (isJoyInitialDataPersonalized(rootJoy)) {
    responseHeaders.set("Cache-Control", JOY_PERSONALIZED_CACHE_CONTROL);
  } else if (fullPageCacheControl) {
    responseHeaders.set("Oxygen-Cache-Control", fullPageCacheControl);
    if (!responseHeaders.has("Vary")) {
      responseHeaders.set("Vary", "Accept-Encoding");
    }
  }

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
