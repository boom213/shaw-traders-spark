import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/hooks/useStore";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AnalyticsGate, CookieConsent } from "@/components/site/CookieConsent";
import { MobileTabBar } from "@/components/site/MobileTabBar";
import { OrderingBanner } from "@/components/site/OrderingBanner";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/i18n";
import { setupServiceWorker } from "@/lib/pwa";
import { setupErrorReporting } from "@/lib/error-reporting";
import { categoriesQuery } from "@/lib/queries";
import { BUSINESS } from "@/lib/catalog";

/** Primary sections, emitted as SiteNavigationElement JSON-LD for sitelinks. */
const SITE_SECTIONS = [
  { name: "Shop EV Spare Parts", path: "/shop" },
  { name: "Electric Scooters", path: "/scooters" },
  { name: "Part Categories", path: "/categories" },
  { name: "Find Parts for Your EV", path: "/find-parts" },
  { name: "Offers & Deals", path: "/offers" },
  { name: "Dealer & Bulk Orders", path: "/bulk" },
  { name: "About Shaw Traders EV", path: "/about" },
  { name: "Contact", path: "/contact" },
];


function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Prefetched on the server so the header category nav and footer Shop column
  // are present in the crawled HTML rather than filled in after hydration.
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQuery()),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Shaw Traders EV — EV Parts & Accessories, Bud Bud" },
      {
        name: "description",
        content:
          "EV spare parts, batteries, chargers, motors and controllers from Shaw Traders EV, Defence Colony, Bud Bud, Bardhaman.",
      },
      { name: "author", content: "Shaw Traders EV" },
      { name: "google-site-verification", content: "trvCjda-37PeHboaItlX_sikYg_NNxdrA_2eoj8-Zng" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: BUSINESS.name },
      { property: "og:image", content: BUSINESS.banner },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: BUSINESS.banner },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },

    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${BUSINESS.site}/#organization`,
          name: BUSINESS.name,
          url: BUSINESS.site,
          logo: {
            "@type": "ImageObject",
            url: BUSINESS.logo,
            width: 512,
            height: 512,
          },
          image: BUSINESS.banner,
          ...(BUSINESS.sameAs.length > 0 ? { sameAs: BUSINESS.sameAs } : {}),
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: `+91${BUSINESS.phone}`,
              contactType: "customer service",
              areaServed: "IN",
              availableLanguage: ["en", "hi", "bn"],
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${BUSINESS.site}/#website`,
          url: BUSINESS.site,
          name: BUSINESS.name,
          publisher: { "@id": `${BUSINESS.site}/#organization` },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${BUSINESS.site}/shop?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          SITE_SECTIONS.map((s) => ({
            "@context": "https://schema.org",
            "@type": "SiteNavigationElement",
            name: s.name,
            url: `${BUSINESS.site}${s.path}`,
          })),
        ),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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

  useEffect(() => {
    setupErrorReporting();
    setupServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <StoreProvider>
        <div className="flex min-h-screen flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Skip to main content
          </a>
          <OrderingBanner />
          <Header />
          <main id="main" className="flex-1 pb-16 lg:pb-0">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>

          <Footer />
        </div>
        <MobileTabBar />
        <WhatsAppFab />
        <CookieConsent />
        <AnalyticsGate />
        <Toaster position="top-center" />
      </StoreProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
