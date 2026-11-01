import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CartProvider } from "../lib/cart";
import { getShop } from "../lib/shop.functions";
import { Footer, Header } from "../components/tt/chrome";
import { AccountProvider } from "../lib/account";
import { c } from "../lib/content";

import appCss from "../styles.css?url";
import { reportHiggsfieldError } from "../lib/higgsfield-error-reporting";
// Page metadata (browser <title>/favicon + social og: tags) committed into the
// repo by the marketplace meta API and read at BUILD time — no runtime fetch.
// Editing it via the app settings UI rewrites this file and redeploys the app.
import appMetaJson from "../app-meta.json";

declare const __HF_DESIGN_INSPECTOR__: boolean;

// Built-in defaults for any field that isn't set in app-meta.json.
const DEFAULT_TITLE = "Little Bean | Baby food store in the Maldives";
const DEFAULT_DESCRIPTION = "Organic porridge, oats, snacks, pasta and fruit pouches for babies and toddlers from Double Happiness, Little Freddie and more. Order on WhatsApp, Viber or by bank transfer.";

type AppMeta = {
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  favicon_url?: string | null;
  og_video_url?: string | null;
};

const appMeta = appMetaJson as AppMeta;

// Build the document head (title / description / og: / twitter: / favicon) from
// app-meta.json, falling back to the defaults above for any unset field.
// og_title/og_description double as the browser <title> and meta description;
// og_image_url (when set) also drives the twitter card + image. Built from
// inline tag literals (conditional spreads for the optional image/favicon) so
// it matches the head() shape TanStack expects.
// favicon/og images live in THIS app's own /assets, so the host is never
// inherent. app-meta.json may carry an absolute higgsfield-app URL with a STALE
// host — baked from the app this one was copied/remixed/renamed from — which would
// serve the wrong app's favicon/og. Strip any higgsfield-app host (prod
// higgsfield.app + dev higgsfield-dev.app) down to a root-relative path so it
// always resolves against whoever serves THIS page (preview / prod / custom
// domain). Genuinely external URLs (a CDN image the owner set) are left absolute.
const APP_HOST_ZONES = ["higgsfield.app", "higgsfield-dev.app"];

function toOwnAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return value; // already root-relative
  try {
    const u = new URL(value);
    const isAppHost = APP_HOST_ZONES.some(
      (zone) => u.hostname === zone || u.hostname.endsWith(`.${zone}`),
    );
    if (isAppHost) return u.pathname + u.search;
    return value; // external host (CDN, etc.) — keep absolute
  } catch {
    return value; // not a parseable URL — leave as-is
  }
}

function buildHead(meta: AppMeta, settings?: Record<string, string>) {
  const title = settings ? c(settings, "seo_title") : (meta.og_title ?? DEFAULT_TITLE);
  const description = settings ? c(settings, "seo_description") : (meta.og_description ?? DEFAULT_DESCRIPTION);
  const ogImage = toOwnAssetUrl(meta.og_image_url);
  const favicon = toOwnAssetUrl(meta.favicon_url);
  const ogVideo = toOwnAssetUrl(meta.og_video_url);

  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title },
      { name: "description", content: description },
      { name: "author", content: "Little Bean" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { name: "twitter:image", content: ogImage },
          ]
        : []),
      // Cover video (og:video) — the animated counterpart of og:image; the
      // Higgsfield feed cards also play it on hover.
      ...(ogVideo ? [{ property: "og:video", content: ogVideo }] : []),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Figtree:wght@400..700&family=Fredoka:wght@500..700&display=swap" },
      { rel: "stylesheet", href: appCss },
      ...(favicon ? [{ rel: "icon", href: favicon }] : []),
    ],
  };
}

function NotFoundComponent() {
  return (
    <div className="tt-wrap flex min-h-[60vh] flex-col items-center justify-center gap-3 py-20 text-center">
      <p className="tt-display text-6xl font-extrabold text-tt-leaf">Oops</p>
      <h1 className="tt-display text-2xl font-bold">We couldn't find that page</h1>
      <p className="text-tt-soft">It may have moved, or the little one pressed a button.</p>
      <Link to="/shop" className="mt-3 rounded-full bg-tt-leaf px-6 py-3 font-semibold text-white">Go to the shop</Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportHiggsfieldError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="tt-wrap flex min-h-[60vh] flex-col items-center justify-center gap-3 py-20 text-center">
      <h1 className="tt-display text-2xl font-bold">This page didn't load</h1>
      <p className="text-tt-soft">Something went wrong on our end. Please try again.</p>
      <details className="max-w-md text-left text-xs text-tt-soft">
        <summary className="cursor-pointer text-center">Details</summary>
        <code suppressHydrationWarning className="mt-2 block whitespace-pre-wrap break-words rounded-xl bg-white p-3 ring-1 ring-tt-line">{`${error?.name ?? "Error"}: ${error?.message ?? String(error)}\n${typeof window === "undefined" ? "server" : window.location.pathname}`}</code>
      </details>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="rounded-full bg-tt-leaf px-5 py-2.5 font-semibold text-white"
        >
          Try again
        </button>
        <a href="/" className="rounded-full px-5 py-2.5 font-semibold ring-1 ring-tt-line">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Read the committed page metadata at build time (no runtime fetch).
  head: ({ loaderData }) => buildHead(appMeta, loaderData?.settings),
  loader: () => getShop(),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="tt">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isAdmin = useRouterState({ select: (st) => st.location.pathname.startsWith("/admin") });

  useEffect(() => {
    if (!__HF_DESIGN_INSPECTOR__) {
      return;
    }

    void import("../module/design-inspector/runtime")
      .then(({ installHiggsfieldDesignInspector }) => {
        installHiggsfieldDesignInspector();
      })
      .catch((error) => {
        reportHiggsfieldError(
          error instanceof Error ? error : new Error("Failed to load design inspector"),
          {
            boundary: "higgsfield_design_inspector_import",
          },
        );
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        <CartProvider>
          {isAdmin ? (
            /* The admin back office has its own layout: no shop header or footer. */
            <Outlet />
          ) : (
            <>
              <Header />
              <main>
                {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                <Outlet />
              </main>
              <Footer />
            </>
          )}
        </CartProvider>
      </AccountProvider>
    </QueryClientProvider>
  );
}
