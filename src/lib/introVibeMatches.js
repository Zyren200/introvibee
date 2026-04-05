import {
  getStoredSessionToken,
  isApiUnavailableError,
  isRemoteAuthEnabled,
  requestIntroVibeApi,
} from "./introVibeApi";

export const shouldUseRemoteMatches = (authMode, currentUserId) =>
  Boolean(currentUserId) &&
  (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken()));

const isRecoverableMatchesApiError = (error) =>
  isApiUnavailableError(error) || Number(error?.status) >= 500;

export const shouldFallbackToLegacyMatches = (error) =>
  isRemoteAuthEnabled() && isRecoverableMatchesApiError(error);

export const fetchRemoteMatches = async () => {
  const payload = await requestIntroVibeApi("/api/matches");

  return {
    matches: Array.isArray(payload?.matches) ? payload.matches : [],
    generatedAt: payload?.generatedAt || Date.now(),
  };
};
