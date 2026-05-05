const SESSION_TOKEN_KEY = "introVibeSessionToken";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const AUTH_MODE = (import.meta.env.VITE_INTROVIBE_AUTH_MODE || "hybrid").toLowerCase();

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

const getApiErrorMessage = (path, status, payload) => {
  if (payload?.error) {
    return payload.error;
  }

  if (status === 404 && path.startsWith("/api/")) {
    if (API_BASE_URL) {
      return `IntroVibe API route was not found at ${API_BASE_URL}${path}. Check your Vercel deployment or VITE_API_BASE_URL.`;
    }

    return "IntroVibe API route was not found. You are likely running the Vite frontend without the Vercel API. Use VITE_INTROVIBE_AUTH_MODE=hybrid, set VITE_API_BASE_URL to your deployed Vercel URL, or run through vercel dev.";
  }

  return `Request failed with status ${status}.`;
};

export const isRemoteAuthEnabled = () => AUTH_MODE === "hybrid" || AUTH_MODE === "api";
export const isApiOnlyMode = () => AUTH_MODE === "api";

export const getStoredSessionToken = () => {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to read IntroVibe session token", error);
    return null;
  }
};

export const setStoredSessionToken = (token) => {
  try {
    if (!token) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      return;
    }

    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch (error) {
    console.error("Failed to store IntroVibe session token", error);
  }
};

export const clearStoredSessionToken = () => {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to clear IntroVibe session token", error);
  }
};

export const isApiUnavailableError = (error) => error?.code === "API_UNAVAILABLE";
export const isRecoverableApiError = (error) =>
  isApiUnavailableError(error) || Number(error?.status) >= 500;

export const requestIntroVibeApi = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const sessionToken = options.sessionToken ?? getStoredSessionToken();

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  let response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
    });
  } catch (error) {
    const apiError = new Error("IntroVibe API is unavailable.");
    apiError.code = "API_UNAVAILABLE";
    apiError.cause = error;
    throw apiError;
  }

  const rawResponse = await response.text();
  let data = {};

  try {
    data = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const apiError = new Error(getApiErrorMessage(path, response.status, data));
    apiError.status = response.status;
    apiError.code = response.status === 404 ? "API_UNAVAILABLE" : "API_ERROR";
    apiError.payload = data;
    throw apiError;
  }

  return data;
};
