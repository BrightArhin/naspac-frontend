const stripTrailingSlash = (value: string) => value.replace(/\/$/, "");

export const API_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
);

const legacyApiBases = [
  "http://localhost:3000",
  "https://nss.cocobod.net",
  "https://nssapi.cocobod.net",
];

export function normalizeApiUrl(url: string) {
  if (!url) {
    return API_BASE_URL;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  const matchedBase = legacyApiBases.find((base) => url.startsWith(base));
  if (matchedBase) {
    return `${API_BASE_URL}${url.slice(matchedBase.length)}`;
  }

  return url;
}

export function isManagedApiUrl(url: string) {
  return (
    url.startsWith("/") || legacyApiBases.some((base) => url.startsWith(base))
  );
}
