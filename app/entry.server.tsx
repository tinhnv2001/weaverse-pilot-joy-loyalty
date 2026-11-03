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
  const joyCsp = joyCspDirectives({
    apiUrl: context.env?.JOY_API_URL,
    assetUrl: context.env?.JOY_WIDGET_ASSET_URL,
  });
  const { nonce, header, NonceProvider } = createContentSecurityPolicy({
    ...weaverseCsp,
    scriptSrc: [
      "'self'",
      ...(weaverseCsp.scriptSrc as string[]),
      ...joyCsp.scriptSrc,
    ],
    connectSrc: [
      "'self'",
      ...(weaverseCsp.connectSrc as string[]),
      ...joyCsp.connectSrc,
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://cdn.shopify.com",
      ...(weaverseCsp.styleSrc as string[]),
      ...joyCsp.styleSrc,
    ],
    imgSrc: ["'self'", "data:", "https://cdn.shopify.com", ...joyCsp.imgSrc],
    fontSrc: ["'self'", "data:", ...joyCsp.fontSrc],
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
  const rootJoy = (
    reactRouterContext.staticHandlerContext.loaderData?.root as
      | { joy?: Parameters<typeof isJoyInitialDataPersonalized>[0] }
      | undefined
  )?.joy;
  const joyPersonalized = isJoyInitialDataPersonalized(rootJoy);
  const fullPageCacheControl = joyPersonalized
    ? null
    : getFullPageCacheControl(request, responseStatusCode);
  if (joyPersonalized) {
    // Member Joy data is embedded in the document: never share it.
    responseHeaders.set("Cache-Control", JOY_PERSONALIZED_CACHE_CONTROL);
  } else if (fullPageCacheControl) {
    responseHeaders.set("Oxygen-Cache-Control", fullPageCacheControl);
    if (!responseHeaders.has("Vary")) {
      responseHeaders.set("Vary", "Accept-Encoding, Cookie");
    }
  }

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
