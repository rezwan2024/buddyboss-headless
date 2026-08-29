import type { NextConfig } from "next";

// Media may be CDN-offloaded (buddyboss-offload-media is active on the
// remote site), so the image host isn't fixed — derive it from WP_URL
// instead of hardcoding a hostname.
const wpHostname = process.env.WP_URL ? new URL(process.env.WP_URL).hostname : undefined;

const nextConfig: NextConfig = {
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
