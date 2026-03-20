function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

type HeaderReader = {
  get(name: string): string | null;
};

export function getOriginFromHeaders(headersStore: HeaderReader) {
  const forwardedHost = headersStore.get("x-forwarded-host");
  const host = forwardedHost ?? headersStore.get("host");

  if (!host) {
    return null;
  }

  const forwardedProto = headersStore.get("x-forwarded-proto");
  const protocol =
    forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}

export function buildAbsoluteUrl(origin: string, path: string) {
  return `${trimTrailingSlash(origin)}${path.startsWith("/") ? path : `/${path}`}`;
}
