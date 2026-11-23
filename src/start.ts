import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * Anti-framing and basic hardening headers on every response. Framing is
 * allowed only by this site and the Lovable editor preview; script sources are
 * not restricted because Razorpay and Google Maps load their own scripts.
 */
const FRAME_ANCESTORS = "'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app";
const PRIMARY_HOSTS = new Set(["shawtradersev.com", "www.shawtradersev.com"]);

export function applySecurityHeaders(response: Response, host: string): Response {
  let res = response;
  const set = (name: string, value: string) => {
    try {
      res.headers.set(name, value);
    } catch {
      res = new Response(res.body, res);
      res.headers.set(name, value);
    }
  };
  set("Content-Security-Policy", `frame-ancestors ${FRAME_ANCESTORS}; object-src 'none'; base-uri 'self'`);
  if (PRIMARY_HOSTS.has(host.toLowerCase())) set("X-Frame-Options", "SAMEORIGIN");
  set("X-Content-Type-Options", "nosniff");
  set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const host = new URL(request.url).hostname;
  const result = await next();
  if (result instanceof Response) return applySecurityHeaders(result, host);
  return { ...result, response: applySecurityHeaders(result.response, host) };
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware],
}));
