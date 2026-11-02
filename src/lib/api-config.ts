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

export function resolveFileUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  const isLocalApi = /localhost|127\.0\.0\.1/.test(API_BASE_URL);
  if (!isLocalApi) return url;

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/files/")) {
      return `${API_BASE_URL}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return url;
  }

  return url;
}

export async function fetchAppointmentLetterPreview(
  submissionId: number,
  departmentId: number,
) {
  const response = await fetch("/users/preview-appointment-letter", {
    method: "POST",
    headers: {
      Accept: "application/pdf",
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ submissionId, departmentId }),
  });
  if (!response.ok) {
    let message = "Failed to load the appointment letter";
    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch {
      // The body is not JSON.
    }
    throw new Error(message);
  }
  const data = await response.arrayBuffer();
  const header = String.fromCharCode(...new Uint8Array(data.slice(0, 4)));
  if (header !== "%PDF") {
    throw new Error("Failed to load the appointment letter");
  }
  return URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
}
