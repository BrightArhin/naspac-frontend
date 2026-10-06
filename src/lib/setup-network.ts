import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, isManagedApiUrl, normalizeApiUrl } from "./api-config";
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  storeSessionTokens,
} from "./auth-session";

let refreshPromise: Promise<string | null> | null = null;
const rawAxios = axios.create();

function isPublicAuthPath(url: string) {
  return [
    "/auth/login-personnel",
    "/auth/login-staff-admin",
    "/auth/refresh",
    "/auth/request-forgot-password",
    "/auth/forgot-password",
    "/auth/onboarding-reset-password",
  ].some((path) => url.includes(path));
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = rawAxios
      .post(normalizeApiUrl("/auth/refresh"), { refreshToken })
      .then((response) => {
        const data = response.data;
        if (data?.accessToken) {
          storeSessionTokens(data.accessToken, data.refreshToken);
          return data.accessToken as string;
        }
        clearSessionTokens();
        return null;
      })
      .catch(() => {
        clearSessionTokens();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function withAuthHeader(
  headers: Headers,
  accessToken: string | null,
  url: string,
) {
  if (!accessToken || headers.has("Authorization") || isPublicAuthPath(url)) {
    return headers;
  }

  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

function toRequestHeaders(headers?: HeadersInit) {
  return new Headers(headers || {});
}

axios.defaults.baseURL = API_BASE_URL;

axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.url) {
    config.url = normalizeApiUrl(config.url);
  }

  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  const accessToken = getAccessToken();
  if (
    accessToken &&
    config.url &&
    !isPublicAuthPath(config.url) &&
    !config.headers.get("Authorization")
  ) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestConfig = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (
      !requestConfig?.url ||
      requestConfig._retry ||
      error.response?.status !== 401 ||
      isPublicAuthPath(requestConfig.url)
    ) {
      return Promise.reject(error);
    }

    const refreshedAccessToken = await refreshAccessToken();
    if (!refreshedAccessToken) {
      return Promise.reject(error);
    }

    requestConfig._retry = true;
    if (!requestConfig.headers) {
      requestConfig.headers = new AxiosHeaders();
    }
    requestConfig.headers.set(
      "Authorization",
      `Bearer ${refreshedAccessToken}`,
    );
    return axios(requestConfig);
  },
);

const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const normalizedUrl = isManagedApiUrl(requestUrl)
    ? normalizeApiUrl(requestUrl)
    : requestUrl;
  const requestHeaders = toRequestHeaders(
    init?.headers || (input instanceof Request ? input.headers : undefined),
  );
  const accessToken = getAccessToken();
  withAuthHeader(requestHeaders, accessToken, normalizedUrl);

  const executeFetch = (token: string | null) => {
    const nextHeaders = new Headers(requestHeaders);
    if (token) {
      withAuthHeader(nextHeaders, token, normalizedUrl);
    }

    return originalFetch(normalizedUrl, {
      ...init,
      headers: nextHeaders,
    });
  };

  let response = await executeFetch(accessToken);
  if (response.status !== 401 || isPublicAuthPath(normalizedUrl)) {
    return response;
  }

  const refreshedAccessToken = await refreshAccessToken();
  if (!refreshedAccessToken) {
    return response;
  }

  response = await executeFetch(refreshedAccessToken);
  return response;
};
