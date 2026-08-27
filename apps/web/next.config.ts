import type { NextConfig } from "next";

// Media may be CDN-offloaded (buddyboss-offload-media is active on the
// remote site), so the image host isn't fixed — derive it from WP_URL
// instead of hardcoding a hostname.
const wpHostname = process.env.WP_URL ? new URL(process.env.WP_URL).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: wpHostname ? [{ protocol: "https", hostname: wpHostname }] : [],
  },
};

export default nextConfig;
