/**
 * Parameters Keycloak appends to the redirect URI after an SSO attempt.
 * They are removed before a retry so the next login starts clean.
 */
const OIDC_CALLBACK_PARAMS = [
  "code",
  "error",
  "error_description",
  "iss",
  "session_state",
  "state",
] as const;

/**
 * Raised when single sign-on cannot complete. The message is safe to
 * show to the user.
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Reads an OIDC error from the callback URL, if the identity provider
 * redirected back with one.
 * @returns the error code and optional description, or `undefined` when
 * the URL is not an error callback.
 */
export function readOidcError():
  | { error: string; description?: string }
  | undefined {
  const fragmentParams = new URLSearchParams(
    window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash,
  );
  const searchParams = new URLSearchParams(window.location.search);
  const error =
    fragmentParams.get("error") ?? searchParams.get("error") ?? undefined;
  if (!error) {
    return undefined;
  }

  const description =
    fragmentParams.get("error_description") ??
    searchParams.get("error_description") ??
    undefined;

  return description ? { error, description } : { error };
}

/**
 * Drops the OIDC callback from the address bar and reloads so the next
 * startup can begin a fresh login. Reloading a URL that still contains
 * `error` would show the failure again instead of contacting SSO.
 */
export function retryAuthentication(): void {
  const url = new URL(window.location.href);
  for (const key of OIDC_CALLBACK_PARAMS) {
    url.searchParams.delete(key);
  }

  const rawHash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (rawHash) {
    const hashParams = new URLSearchParams(rawHash);
    const hasOidcParam = OIDC_CALLBACK_PARAMS.some((key) =>
      hashParams.has(key),
    );
    if (hasOidcParam) {
      url.hash = "";
    }
  }

  window.location.replace(url.toString());
}
