/**
 * Delay before the next TrustArc cookie re-read while waiting for the
 * visitor to accept analytics. Each check schedules the next one with
 * `setTimeout` so a slow check cannot overlap the following one.
 */
export const CONSENT_POLL_DELAY_MS = 500;

/**
 * Checks TrustArc's preference cookie for analytics consent (category 2).
 * Returns false when the cookie is absent or does not include the category.
 *
 * A missing cookie is not treated as an explicit rejection. TrustArc does
 * not leave a durable "denied" signal we can read, so absence only means
 * "not yet granted".
 */
export function hasAnalyticsConsent(): boolean {
  const match = document.cookie.match(/cmapi_cookie_privacy=([^;]+)/);
  if (!match) {
    return false;
  }
  const value = decodeURIComponent(match[1]);
  return /permit\s+[\d,]*2/.test(value);
}
