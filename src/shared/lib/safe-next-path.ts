const MAX_LENGTH = 512;

/**
 * A post-login return path, or null if it isn't one we'd follow: only a same-site
 * relative path ("/en/score?x=1"), never another origin ("//evil.com", "/\\evil.com",
 * "https://…"), an API route or something absurdly long. Use it on every `next`
 * taken from a URL or cookie before redirecting to it (open-redirect guard).
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_LENGTH) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  // control characters and backslashes can be read as an authority by some browsers
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw, "http://same.invalid");
  } catch {
    return null;
  }
  if (parsed.origin !== "http://same.invalid") return null;
  if (parsed.pathname === "/api" || parsed.pathname.startsWith("/api/")) return null;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/** The login URL query that brings the visitor back to `path` afterwards. */
export function withNextParam(loginPath: string, path: string | null | undefined): string {
  const next = safeNextPath(path);
  return next ? `${loginPath}?next=${encodeURIComponent(next)}` : loginPath;
}
