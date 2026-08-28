// WordPress sends entity-encoded text in name/title fields (e.g. "&#039;").
// Decode the handful that actually show up rather than pulling in a library.
export function decodeEntities(text: string): string {
  return text
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Notification descriptions come back as HTML with an `<a href>` pointing
// at the raw WordPress host baked in — never render that with
// dangerouslySetInnerHTML, it would leak a link to WordPress into the
// browser (this project never lets that happen, see the member-profile
// `link` field fix in DECISIONS.md). Strip tags to get safe plain text.
export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).trim();
}

/** "First Responders Children's Foundation, Shakeel Ahmad" -> array of decoded names. */
export function parseReactedNames(reactedNames: string): string[] {
  return reactedNames
    .split(",")
    .map((name) => decodeEntities(name.trim()))
    .filter(Boolean);
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
