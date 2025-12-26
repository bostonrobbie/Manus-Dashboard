export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Optionally accepts a returnTo path to redirect after successful login.
export const getLoginUrl = (returnTo?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  // Include returnTo in the callback URL if provided
  let callbackUrl = `${window.location.origin}/api/oauth/callback`;
  if (returnTo) {
    callbackUrl += `?returnTo=${encodeURIComponent(returnTo)}`;
  }
  
  const redirectUri = callbackUrl;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
