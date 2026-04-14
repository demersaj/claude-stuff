/**
 * Extract JSON shell manifest from app-start-kit.html (or any HTML using the same pattern).
 */

export function extractShellManifestFromHtml(html) {
  const re =
    /<script[^>]*\bid=["']apogee-shell-manifest["'][^>]*\btype=["']application\/apogee-shell-manifest\+json["'][^>]*>([\s\S]*?)<\/script>/i;
  const m = html.match(re);
  if (!m) {
    throw new Error(
      'Could not find <script id="apogee-shell-manifest" type="application/apogee-shell-manifest+json"> ... </script>'
    );
  }
  return JSON.parse(m[1].trim());
}
