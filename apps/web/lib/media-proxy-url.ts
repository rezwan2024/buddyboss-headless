// Routes a BuddyBoss `bb-media-preview` URL (activity photo/video thumbnails)
// through /api/media-proxy instead of hitting the WP host directly — see
// that route's doc comment for why (it adds a retry the raw URL doesn't get
// from Next's image optimizer). Any other URL (avatars, covers, plain
// uploads) is left alone; those are fast, static files that don't need it.
export function mediaProxyUrl(url: string): string {
  if (!url) return url;
  return `/api/media-proxy?url=${encodeURIComponent(url)}`;
}
