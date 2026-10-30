const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// pgpeek has no login: it trusts whoever reaches it, so only its own pages may.
// The Host check stops a website pointing its own name at 127.0.0.1 (DNS rebinding).
// Origin and Sec-Fetch-Site stop a website sending requests from your browser; an
// <img> GET carries no Origin, so it takes both.
export function isLocalRequest(headers: Headers): boolean {
  const host = headers.get("host") ?? "";
  if (!LOCAL_HOST.test(host)) return false;

  const origin = headers.get("origin");
  if (origin && origin !== `http://${host}`) return false;

  const site = headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}
