import type { NextConfig } from "next";

// Media may be CDN-offloaded (buddyboss-offload-media is active on the
// remote site), so the image host isn't fixed — derive it from WP_URL
// instead of hardcoding a hostname.
const wpHostname = process.env.WP_URL ? new URL(process.env.WP_URL).hostname : undefined;

const nextConfig: NextConfig = {
  // Server Actions cap request bodies at 1MB by default — confirmed live,
  // this rejected a real photo upload (11.7MB) with a 413 before the
  // composer's postActivityAction ever ran. The activity composer posts
  // image/video/document uploads as part of a Server Action's body
  // (`<form action={formAction}>`), so this needs to be large enough for a
  // real phone photo or a short video clip.
  //
  // proxyClientMaxBodySize is a second, independent limit — this app's
  // `proxy.ts` (Next's renamed middleware.ts, runs on every request for
  // token refresh) makes Next buffer the whole request body in memory up
  // to a 10MB default, silently truncating anything larger rather than
  // erroring cleanly (confirmed live: raising bodySizeLimit alone changed
  // the failure from a clean 413 to a 500 "Unexpected end of form" — the
  // multipart body was being cut off mid-upload). Both limits need to
  // agree, or the lower one silently wins.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    proxyClientMaxBodySize: "20mb",
  },
  images: {
    remotePatterns: wpHostname ? [{ protocol: "https", hostname: wpHostname }] : [],
    // /api/media-proxy (see its own doc comment) is a local route whose
    // `url` query string varies per image — Next 16 requires an explicit
    // localPatterns entry for any local image src carrying a query string,
    // otherwise next/image 400s it. The route itself validates `url` server
    // side (only WP_URL's own bb-media-preview paths are allowed through),
    // so allowing any search value here doesn't widen that.
    localPatterns: [{ pathname: "/api/media-proxy" }],
  },
};

export default nextConfig;
